import { useState } from "react";
import { ToolSidebar } from "../components/ToolSidebar";
import { ImageFormatConverterTool } from "../tools/image-format-converter/ImageFormatConverterTool";
import { QrCodeTool } from "../tools/qr-code/QrCodeTool";

export type ToolId = "qr-code" | "image-format-converter";

export function App() {
  const [selectedToolId, setSelectedToolId] = useState<ToolId>("qr-code");

  return (
    <main className="app-shell">
      <ToolSidebar
        selectedToolId={selectedToolId}
        onSelectTool={setSelectedToolId}
      />
      <section className="tool-canvas" aria-labelledby="current-tool-title">
        {selectedToolId === "qr-code" ? (
          <QrCodeTool />
        ) : (
          <ImageFormatConverterTool />
        )}
      </section>
    </main>
  );
}
