/** Shown the moment a link is pressed, while the next page loads. */
export default function Loading() {
  return (
    <div className="window" aria-busy="true">
      <div className="window-bar">
        <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <div className="window-body skeleton" aria-hidden="true"><span /><span /><span /></div>
    </div>
  );
}
