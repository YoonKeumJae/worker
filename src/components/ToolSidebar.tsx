export function ToolSidebar() {
  return (
    <aside className="tool-sidebar" aria-label="도구 목록">
      <p className="app-title">Worker</p>
      <ul className="tool-list">
        <li>
          <span className="tool-item" aria-current="page">
            QR코드
          </span>
        </li>
      </ul>
    </aside>
  );
}
