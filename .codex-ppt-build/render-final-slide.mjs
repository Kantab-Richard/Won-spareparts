import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const finalPath = "C:\\Users\\acer\\Desktop\\WONSPAREPARTS\\presentation-output\\wonspareparts-3d-animation-slide.pptx";
const outputPath = "C:\\Users\\acer\\Desktop\\WONSPAREPARTS\\.codex-ppt-build\\wonspareparts-3d-animation-slide-final.png";

const presentation = await PresentationFile.importPptx(await FileBlob.load(finalPath));
const snapshot = await presentation.inspect({ kind: "slide", maxChars: 4000 });
const firstSlide = snapshot.ndjson
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .find((record) => record.kind === "slide");
if (!firstSlide?.id) throw new Error("Could not resolve first slide");
const slide = presentation.resolve(firstSlide.id);
const preview = await presentation.export({ slide, format: "png", scale: 1 });
await fs.writeFile(outputPath, new Uint8Array(await preview.arrayBuffer()));
console.log(path.resolve(outputPath));
