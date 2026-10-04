import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:\\Users\\acer\\Desktop\\WONSPAREPARTS";
const SKILL_DIR = "C:\\Users\\acer\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.915.20218\\skills\\presentations";
const RUNTIME_PYTHON = "C:\\Users\\acer\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const TMP_DIR = path.join(workspaceDir, ".codex-ppt-build");
const OUTPUT_DIR = path.join(workspaceDir, "presentation-output");
const FINAL_PPTX = path.join(OUTPUT_DIR, "wonspareparts-3d-animation-slide.pptx");
const HERO_IMAGE = "C:\\Users\\acer\\.codex\\generated_images\\019f8991-42b6-76c1-a517-d5f8bcdb81c2\\call_3sm5qc0cFCnqeOMISKnA0L4k.png";

const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href,
);

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const family = resolvePresentationFont();
const presentation = Presentation.create({
  slideSize: { width: 1280, height: 720 },
});

const slide = presentation.slides.add();
slide.background.fill = "#07111D";

const heroBytes = await fs.readFile(HERO_IMAGE);
slide.images.add({
  blob: heroBytes,
  contentType: "image/png",
  alt: "3D visual of WONSPAREPARTS app on phone and desktop dashboard in a spare parts warehouse",
  fit: "cover",
  position: { left: 0, top: 0, width: 1280, height: 720 },
});

slide.shapes.add({
  geometry: "rect",
  position: { left: 0, top: 0, width: 580, height: 720 },
  fill: { color: "#050B12", transparency: 10 },
  line: { fill: "none", width: 0 },
});

slide.shapes.add({
  geometry: "rect",
  position: { left: 0, top: 0, width: 1280, height: 720 },
  fill: { color: "#050B12", transparency: 82 },
  line: { fill: "none", width: 0 },
});

const kicker = slide.shapes.add({
  geometry: "textbox",
  position: { left: 72, top: 76, width: 430, height: 34 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
kicker.text = "CLIENT PRESENTATION";
kicker.text.style = {
  typeface: family,
  fontSize: 15,
  bold: true,
  color: "#FF7A18",
  autoFit: "none",
};

const title = slide.shapes.add({
  geometry: "textbox",
  position: { left: 72, top: 130, width: 515, height: 180 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
title.text = "WONSPAREPARTS\nSales & Inventory App";
title.text.style = {
  typeface: family,
  fontSize: 47,
  bold: true,
  color: "#FFFFFF",
  autoFit: "shrinkText",
};

const subtitle = slide.shapes.add({
  geometry: "textbox",
  position: { left: 75, top: 323, width: 460, height: 72 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
subtitle.text = "An installable business app for sales, stock control, receipts, reports and offline sync.";
subtitle.text.style = {
  typeface: family,
  fontSize: 22,
  color: "#D8E2EF",
  autoFit: "shrinkText",
};

const proof = slide.shapes.add({
  geometry: "textbox",
  position: { left: 77, top: 430, width: 445, height: 118 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
proof.text = "Built for spare parts shops that need faster sales, accurate stock records and mobile access from the shop floor.";
proof.text.style = {
  typeface: family,
  fontSize: 19,
  color: "#B8C7D9",
  autoFit: "shrinkText",
};

const footer = slide.shapes.add({
  geometry: "textbox",
  position: { left: 77, top: 602, width: 510, height: 42 },
  fill: "none",
  line: { fill: "none", width: 0 },
});
footer.text = "Phone sales  |  live stock  |  receipt printing  |  offline queue";
footer.text.style = {
  typeface: family,
  fontSize: 16,
  bold: true,
  color: "#6EC6FF",
  autoFit: "shrinkText",
};

slide.speakerNotes.textFrame.setText([
  "Animation sequence for PowerPoint: start with the 3D app visual on screen, then fade in the title, subtitle and footer line in that order.",
  "Talk track: WONSPAREPARTS gives the manager and sales reps one place to sell, track stock, print receipts and keep working when the network is weak.",
  "Close the slide by pointing to the phone and desktop screens as the reason the system works across devices.",
]);
slide.speakerNotes.setVisible(true);

const preview = await presentation.export({ slide, format: "png", scale: 1 });
await fs.writeFile(path.join(TMP_DIR, "wonspareparts-3d-animation-slide-preview.png"), new Uint8Array(await preview.arrayBuffer()));

const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "wonspareparts-3d-animation-slide-candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

await finalizePresentation({
  explicitTotalSlideCount: 1,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [family] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "wonspareparts-3d-animation-slide.validation.json"),
});

console.log(JSON.stringify({ finalPath: FINAL_PPTX, previewPath: path.join(TMP_DIR, "wonspareparts-3d-animation-slide-preview.png") }, null, 2));
