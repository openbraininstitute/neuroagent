// setup_pyodide.ts
import { loadPyodide } from "pyodide";
async function run() {
    const pyodide = await loadPyodide();

    await pyodide.loadPackage("micropip");

    const micropip = pyodide.pyimport("micropip");

    await micropip.install([
    "pydantic",
    "numpy",
    "matplotlib",
    ]);
    console.log("Packages installed.");
}
run()
