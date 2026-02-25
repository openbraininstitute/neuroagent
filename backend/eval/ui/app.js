/* global $ */
(function () {
  const DATA_PATH = "../output/detailed.json";

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toArray(dataObj) {
    return Object.entries(dataObj || {}).map(([name, item]) => ({
      name,
      item,
    }));
  }

  function getMetrics(item) {
    return item?.results?.metrics || [];
  }

  function getMetricScore(item, metricName) {
    const metric = getMetrics(item).find((m) => m.name === metricName);
    return metric && typeof metric.score === "number" ? metric.score : null;
  }

  function getMetricSuccess(item, metricName) {
    const metric = getMetrics(item).find((m) => m.name === metricName);
    return metric ? Boolean(metric.success) : null;
  }

  function allMetricNames(rows) {
    const names = new Set();
    rows.forEach(({ item }) => {
      getMetrics(item).forEach((m) => names.add(m.name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  async function loadData() {
    return $.getJSON(DATA_PATH);
  }

  function renderListPage(dataObj) {
    const rows = toArray(dataObj);
    const metricNames = allMetricNames(rows);
    const $metricSelect = $("#metricSelect");
    const $sortDir = $("#sortDir");
    const $searchInput = $("#searchInput");
    const $tbody = $("#testsTable tbody");
    const $status = $("#statusLine");

    if (!metricNames.length) {
      $status.text("No metrics found in detailed.json.");
      return;
    }

    $metricSelect.empty();
    metricNames.forEach((name) => {
      $metricSelect.append(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });
    if (metricNames.includes("Correctness [GEval]")) {
      $metricSelect.val("Correctness [GEval]");
    }

    function draw() {
      const metric = $metricSelect.val();
      const dir = $sortDir.val();
      const q = $searchInput.val().trim().toLowerCase();

      const filtered = rows.filter(({ name }) => name.toLowerCase().includes(q));
      filtered.sort((a, b) => {
        const sa = getMetricScore(a.item, metric);
        const sb = getMetricScore(b.item, metric);
        const aa = sa === null ? -1 : sa;
        const bb = sb === null ? -1 : sb;
        return dir === "asc" ? aa - bb : bb - aa;
      });

      const html = filtered
        .map(({ name, item }) => {
          const score = getMetricScore(item, metric);
          const scoreText = score === null ? "-" : score.toFixed(3);
          const pass = getMetricSuccess(item, metric);
          const passText = pass === null ? "-" : pass ? "yes" : "no";
          const scoreClass = score !== null && score >= 0.5 ? "score-good" : "score-bad";
          const tags = item?.params?.tags || [];
          const tagsHtml = tags.map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("");
          const href = `./detail.html?test=${encodeURIComponent(name)}`;

          return `
            <tr>
              <td><a href="${href}">${escapeHtml(name)}</a></td>
              <td class="${scoreClass}">${scoreText}</td>
              <td>${passText}</td>
              <td>${tagsHtml}</td>
            </tr>
          `;
        })
        .join("");

      $tbody.html(html);
      const numericScores = filtered
        .map(({ item }) => getMetricScore(item, metric))
        .filter((v) => typeof v === "number");
      const avg =
        numericScores.length > 0
          ? (numericScores.reduce((sum, v) => sum + v, 0) / numericScores.length).toFixed(3)
          : "n/a";

      $status.text(
        `Loaded ${rows.length} tests. Showing ${filtered.length}. Sorted by "${metric}". Average (${metric}) = ${avg}.`
      );
    }

    $metricSelect.on("change", draw);
    $sortDir.on("change", draw);
    $searchInput.on("input", draw);
    $("#reloadBtn").on("click", async function () {
      try {
        const fresh = await loadData();
        renderListPage(fresh);
      } catch (err) {
        $status.text(`Reload failed: ${String(err)}`);
      }
    });

    draw();
  }

  function prettyJson(obj) {
    return JSON.stringify(obj || {}, null, 2);
  }

  function renderDetailPage(dataObj) {
    const params = new URLSearchParams(window.location.search);
    const testName = params.get("test");
    const $status = $("#statusLine");

    if (!testName) {
      $status.text("Missing query parameter: ?test=<test_name>");
      return;
    }

    const item = dataObj[testName];
    if (!item) {
      $status.text(`Test not found: ${testName}`);
      return;
    }

    $("#title").text(`Test: ${testName}`);
    $status.text("Loaded from ../output/detailed.json");

    const metrics = getMetrics(item);
    const gevalMetric = metrics.find((m) => (m.name || "").includes("Correctness [GEval]"));
    const metricsHtml = metrics
      .map((m) => {
        const scoreText = typeof m.score === "number" ? m.score.toFixed(3) : "-";
        const passText = m.success ? "yes" : "no";
        const scoreClass = m.score >= 0.5 ? "score-good" : "score-bad";
        return `
          <tr>
            <td>${escapeHtml(m.name || "")}</td>
            <td class="${scoreClass}">${escapeHtml(scoreText)}</td>
            <td>${escapeHtml(passText)}</td>
            <td>${escapeHtml(String(m.threshold ?? "-"))}</td>
          </tr>
        `;
      })
      .join("");
    $("#metricsTable tbody").html(metricsHtml);
    $("#gevalReasonField").text((gevalMetric && gevalMetric.reason) || "No GEval reason found.");

    $("#userField").text(item.user || "");
    $("#expectedOutputField").text(item.expected_output || "");
    $("#aiResponseField").text(item.ai_response || "");
    $("#expectedToolsField").text(prettyJson(item.expected_tool_calls || []));
    $("#actualToolsField").text(prettyJson(item.actual_tool_calls || []));
    $("#paramsField").text(prettyJson(item.params || {}));
  }

  async function boot() {
    try {
      const dataObj = await loadData();
      if ($("#testsTable").length) {
        renderListPage(dataObj);
      } else if ($("#metricsTable").length) {
        renderDetailPage(dataObj);
      }
    } catch (err) {
      const msg = `Failed to load ${DATA_PATH}. Serve this folder over HTTP (not file://). Error: ${String(err)}`;
      $("#statusLine").text(msg);
    }
  }

  $(boot);
})();
