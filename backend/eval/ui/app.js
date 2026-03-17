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

  function allTags(rows) {
    const tags = new Set();
    rows.forEach(({ item }) => {
      const rowTags = item?.params?.tags || [];
      rowTags.forEach((tag) => {
        if (typeof tag === "string" && tag.trim()) {
          tags.add(tag);
        }
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }

  function productTagsForItem(item) {
    const tags = item?.params?.tags || [];
    return tags.filter((t) => typeof t === "string" && t.startsWith("product:"));
  }

  function hasExpectedOutput(item) {
    const raw = item?.expected_output;
    return typeof raw === "string" && raw.trim().length > 0;
  }

  function interpretEscapedText(value) {
    if (typeof value !== "string" || !value.includes("\\")) {
      return value || "";
    }

    let out = value;
    out = out.replace(/\\r\\n/g, "\n");
    out = out.replace(/\\n/g, "\n");
    out = out.replace(/\\r/g, "\n");
    out = out.replace(/\\t/g, "\t");
    out = out.replace(/\\"/g, '"');
    out = out.replace(/\\\\/g, "\\");
    out = out.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return out;
  }

  async function loadData() {
    if (window.__EVAL_DATA__ && typeof window.__EVAL_DATA__ === "object") {
      return window.__EVAL_DATA__;
    }

    const sep = DATA_PATH.includes("?") ? "&" : "?";
    const cacheBustedPath = `${DATA_PATH}${sep}_ts=${Date.now()}`;
    return $.getJSON(cacheBustedPath);
  }

  function renderListPage(dataObj) {
    const rows = toArray(dataObj);
    const metricNames = allMetricNames(rows);
    const tags = allTags(rows);
    const params = new URLSearchParams(window.location.search);
    const $metricSelect = $("#metricSelect");
    const $tagFilter = $("#tagFilter");
    const $sortDir = $("#sortDir");
    const $searchInput = $("#searchInput");
    const $answerFilter = $("#answerFilter");
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

    $tagFilter.empty();
    $tagFilter.append('<option value="">All tags</option>');
    tags.forEach((tag) => {
      $tagFilter.append(`<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`);
    });
    const initialTag = params.get("tag") || "";
    if (initialTag && tags.includes(initialTag)) {
      $tagFilter.val(initialTag);
    } else {
      $tagFilter.val("");
    }

    const initialAnswerFilter = params.get("answer") || "all";
    const validAnswerFilters = new Set(["all", "answer-present", "answer-missing"]);
    $answerFilter.val(validAnswerFilters.has(initialAnswerFilter) ? initialAnswerFilter : "all");

    function updateSearchParams() {
      const nextParams = new URLSearchParams(window.location.search);
      const selectedTag = $tagFilter.val();
      const selectedAnswerFilter = $answerFilter.val();
      if (selectedTag) {
        nextParams.set("tag", selectedTag);
      } else {
        nextParams.delete("tag");
      }
      if (selectedAnswerFilter && selectedAnswerFilter !== "all") {
        nextParams.set("answer", selectedAnswerFilter);
      } else {
        nextParams.delete("answer");
      }
      const nextQuery = nextParams.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }

    function draw() {
      const metric = $metricSelect.val();
      const dir = $sortDir.val();
      const q = $searchInput.val().trim().toLowerCase();
      const selectedTag = $tagFilter.val();
      const selectedAnswerFilter = $answerFilter.val();

      const filtered = rows.filter(({ name, item }) => {
        const matchesName = name.toLowerCase().includes(q);
        if (!matchesName) {
          return false;
        }
        const rowTags = item?.params?.tags || [];
        if (selectedTag && !rowTags.includes(selectedTag)) {
          return false;
        }
        const answerPresent = hasExpectedOutput(item);
        if (selectedAnswerFilter === "answer-present") {
          return answerPresent;
        }
        if (selectedAnswerFilter === "answer-missing") {
          return !answerPresent;
        }
        return true;
      });
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
          const answerPresent = hasExpectedOutput(item);
          const tagsHtml = tags
            .map((t) => {
              const tagHref = `./index.html?tag=${encodeURIComponent(t)}`;
              return `<a class="pill pill-link" href="${tagHref}">${escapeHtml(t)}</a>`;
            })
            .join("");
          const href = `./detail.html?test=${encodeURIComponent(name)}`;
          const answerMarker = answerPresent
            ? '<span class="pill pill-status pill-ok">present</span>'
            : '<span class="pill pill-status pill-warning">missing</span>';

          return `
            <tr>
              <td><a href="${href}">${escapeHtml(name)}</a></td>
              <td>${answerMarker}</td>
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
      const missingCount = filtered.filter(({ item }) => !hasExpectedOutput(item)).length;

      $status.text(
        `Loaded ${rows.length} tests. Showing ${filtered.length}. Missing answers in view: ${missingCount}. Tag filter: ${selectedTag || "none"}. Answer filter: ${selectedAnswerFilter}. Sorted by "${metric}". Average (${metric}) = ${avg}.`
      );
    }

    $metricSelect.on("change", draw);
    $tagFilter.on("change", function () {
      updateSearchParams();
      draw();
    });
    $answerFilter.on("change", function () {
      updateSearchParams();
      draw();
    });
    $sortDir.on("change", draw);
    $searchInput.on("input", draw);
    $("#clearFiltersBtn").on("click", function () {
      $searchInput.val("");
      $tagFilter.val("");
      $answerFilter.val("all");
      $sortDir.val("desc");
      if (metricNames.includes("Correctness [GEval]")) {
        $metricSelect.val("Correctness [GEval]");
      } else if (metricNames.length) {
        $metricSelect.val(metricNames[0]);
      }
      window.history.replaceState({}, "", window.location.pathname);
      draw();
    });

    draw();
  }

  function renderProductsPage(dataObj) {
    const rows = toArray(dataObj);
    const metricNames = allMetricNames(rows);
    const params = new URLSearchParams(window.location.search);
    const $status = $("#statusLine");
    const $thead = $("#productMetricsTable thead");
    const $tbody = $("#productMetricsTable tbody");
    const $sortBy = $("#productSortBy");
    const $sortDir = $("#productSortDir");

    const groups = new Map();
    rows.forEach(({ name, item }) => {
      const productTags = productTagsForItem(item);
      if (!productTags.length) {
        return;
      }

      productTags.forEach((tag) => {
        if (!groups.has(tag)) {
          groups.set(tag, []);
        }
        groups.get(tag).push({ name, item });
      });
    });

    const sortOptions = [
      { value: "product", label: "product" },
      { value: "tests", label: "tests" },
      { value: "missing", label: "missing answers" },
      ...metricNames.map((metric) => ({
        value: `metric:${metric}`,
        label: `${metric} avg`,
      })),
    ];
    $sortBy.empty();
    sortOptions.forEach((opt) => {
      $sortBy.append(`<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`);
    });

    const initialSortBy = params.get("psort") || "product";
    const validSortValues = new Set(sortOptions.map((o) => o.value));
    $sortBy.val(validSortValues.has(initialSortBy) ? initialSortBy : "product");

    const initialSortDir = params.get("pdir") || "asc";
    $sortDir.val(initialSortDir === "desc" ? "desc" : "asc");

    if (!groups.size) {
      $status.text("No product:* tags found in detailed.json.");
      $thead.html("");
      $tbody.html("");
      return;
    }

    const sortedProducts = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    const headerCells = ["<th>Product</th>", "<th>Tests</th>", "<th>Missing Answers</th>"];
    metricNames.forEach((metric) => {
      headerCells.push(`<th>${escapeHtml(metric)} avg</th>`);
    });
    $thead.html(`<tr>${headerCells.join("")}</tr>`);

    function updateProductSearchParams() {
      const nextParams = new URLSearchParams(window.location.search);
      const selectedSortBy = $sortBy.val();
      const selectedSortDir = $sortDir.val();
      if (selectedSortBy && selectedSortBy !== "product") {
        nextParams.set("psort", selectedSortBy);
      } else {
        nextParams.delete("psort");
      }
      if (selectedSortDir && selectedSortDir !== "asc") {
        nextParams.set("pdir", selectedSortDir);
      } else {
        nextParams.delete("pdir");
      }
      const nextQuery = nextParams.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }

    function drawProductTable() {
      const selectedSortBy = $sortBy.val();
      const selectedSortDir = $sortDir.val();

      const groupStats = sortedProducts.map((productTag) => {
        const groupRows = groups.get(productTag) || [];
        const testsCount = groupRows.length;
        const missingAnswers = groupRows.filter(({ item }) => !hasExpectedOutput(item)).length;
        const metricAverages = {};

        metricNames.forEach((metric) => {
          const scores = groupRows
            .map(({ item }) => getMetricScore(item, metric))
            .filter((v) => typeof v === "number");
          const avgScore =
            scores.length > 0
              ? scores.reduce((sum, v) => sum + v, 0) / scores.length
              : null;
          metricAverages[metric] = avgScore;
        });

        return { productTag, testsCount, missingAnswers, metricAverages };
      });

      groupStats.sort((a, b) => {
        let cmp = 0;
        if (selectedSortBy === "product") {
          cmp = a.productTag.localeCompare(b.productTag);
        } else if (selectedSortBy === "tests") {
          cmp = a.testsCount - b.testsCount;
        } else if (selectedSortBy === "missing") {
          cmp = a.missingAnswers - b.missingAnswers;
        } else if (selectedSortBy && selectedSortBy.startsWith("metric:")) {
          const metricName = selectedSortBy.slice("metric:".length);
          const av = a.metricAverages[metricName];
          const bv = b.metricAverages[metricName];
          const aa = typeof av === "number" ? av : -1;
          const bb = typeof bv === "number" ? bv : -1;
          cmp = aa - bb;
        }
        return selectedSortDir === "desc" ? -cmp : cmp;
      });

      const bodyRowsHtml = groupStats
        .map((row) => {
          const metricCells = metricNames
            .map((metric) => {
              const avgScoreNumber = row.metricAverages[metric];
              const avgScore =
                typeof avgScoreNumber === "number" ? avgScoreNumber.toFixed(3) : "-";
              const scoreClass =
                avgScore !== "-" && Number(avgScore) >= 0.5 ? "score-good" : "score-bad";
              return `<td class="${avgScore === "-" ? "" : scoreClass}">${escapeHtml(avgScore)}</td>`;
            })
            .join("");

          return `
            <tr>
              <td><a class="pill pill-link" href="./index.html?tag=${encodeURIComponent(row.productTag)}">${escapeHtml(row.productTag)}</a></td>
              <td>${row.testsCount}</td>
              <td>${row.missingAnswers}</td>
              ${metricCells}
            </tr>
          `;
        })
        .join("");

      $tbody.html(bodyRowsHtml);
      $status.text(
        `Loaded ${rows.length} tests. Showing ${groupStats.length} product groups with ${metricNames.length} metrics each. Sorted by ${selectedSortBy} (${selectedSortDir}).`
      );
    }

    $sortBy.on("change", function () {
      updateProductSearchParams();
      drawProductTable();
    });
    $sortDir.on("change", function () {
      updateProductSearchParams();
      drawProductTable();
    });
    $("#productClearFiltersBtn").on("click", function () {
      $sortBy.val("product");
      $sortDir.val("asc");
      window.history.replaceState({}, "", window.location.pathname);
      drawProductTable();
    });

    drawProductTable();
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
    $("#gevalReasonField").text(
      interpretEscapedText((gevalMetric && gevalMetric.reason) || "No GEval reason found.")
    );

    $("#userField").text(interpretEscapedText(item.user || ""));
    $("#expectedOutputField").text(interpretEscapedText(item.expected_output || ""));
    $("#aiResponseField").text(interpretEscapedText(item.ai_response || ""));
    $("#expectedToolsField").text(prettyJson(item.expected_tool_calls || []));
    $("#actualToolsField").text(prettyJson(item.actual_tool_calls || []));
    $("#paramsField").text(prettyJson(item.params || {}));

    const tags = item?.params?.tags || [];
    const tagsHtml = tags.length
      ? tags
          .map((t) => {
            const href = `./index.html?tag=${encodeURIComponent(t)}`;
            return `<a class="pill pill-link" href="${href}">${escapeHtml(t)}</a>`;
          })
          .join("")
      : '<span class="muted">No tags</span>';
    $("#tagsField").html(tagsHtml);

    const answerPresent = hasExpectedOutput(item);
    const answerMarkerHtml = answerPresent
      ? '<span class="pill pill-status pill-ok">Expected output: present</span>'
      : '<span class="pill pill-status pill-warning">Expected output: missing</span>';
    $("#answerPresenceMarker").html(answerMarkerHtml);
  }

  async function boot() {
    try {
      const dataObj = await loadData();
      if ($("#testsTable").length) {
        renderListPage(dataObj);
      } else if ($("#productMetricsTable").length) {
        renderProductsPage(dataObj);
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
