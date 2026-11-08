/** The product's one container: a paper window on the amber field. The three rings are decoration and are not controls. */
export function Window({ title, children, className = "", id }: { title: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section className={`window ${className}`} aria-label={title} id={id}>
      <div className="window-bar">
        <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>{title}</span>
      </div>
      <div className="window-body">{children}</div>
    </section>
  );
}
