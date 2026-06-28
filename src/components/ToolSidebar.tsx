import type { ToolId } from "../app/App";

type ToolSidebarProps = {
  selectedToolId: ToolId;
  onSelectTool: (toolId: ToolId) => void;
};

const tools: Array<{ id: ToolId; label: string }> = [
  { id: "qr-code", label: "QR코드" },
  { id: "image-format-converter", label: "이미지 변환" },
];

export function ToolSidebar({ selectedToolId, onSelectTool }: ToolSidebarProps) {
  return (
    <aside className="tool-sidebar" aria-label="도구 목록">
      <p className="app-title">Worker</p>
      <ul className="tool-list">
        {tools.map((tool) => (
          <li key={tool.id}>
            <button
              className="tool-item"
              type="button"
              aria-current={selectedToolId === tool.id ? "page" : undefined}
              onClick={() => onSelectTool(tool.id)}
            >
              {tool.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
