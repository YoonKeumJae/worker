import { ToolSidebar } from "../components/ToolSidebar";
import { QrCodeToolPlaceholder } from "../tools/qr-code/QrCodeToolPlaceholder";

export function App() {
  return (
    <main className="app-shell">
      <ToolSidebar />
      <section className="tool-canvas" aria-labelledby="current-tool-title">
        <QrCodeToolPlaceholder />
      </section>
    </main>
  );
}
