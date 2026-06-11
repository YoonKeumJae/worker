import { ToolSidebar } from "../components/ToolSidebar";
import { QrCodeTool } from "../tools/qr-code/QrCodeTool";

export function App() {
  return (
    <main className="app-shell">
      <ToolSidebar />
      <section className="tool-canvas" aria-labelledby="current-tool-title">
        <QrCodeTool />
      </section>
    </main>
  );
}
