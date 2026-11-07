// PROTOTYPE — Variant C「Block」：強調色當材質：Cover 左側實色帶、chosen 欄為實色面板、表頭實色、頁碼方塊、Bricolage Grotesque 標題
import type { DeckCopy, VariantProps } from "./types"

function Footer({ copy, page }: { copy: DeckCopy; page: number | null }) {
  return (
    <div className="vc-footer">
      <span>{copy.deckTitle}</span>
      {page !== null ? <span className="vc-pg">{page}</span> : null}
    </div>
  )
}

function Boundary({ text }: { text: string }) {
  const [head, ...rest] = text.split(/[:：]/)
  return (
    <p className="vc-boundary">
      <b>{head}</b> {rest.join(":").trim()}
    </p>
  )
}

export function VariantC({ page, copy, lang }: VariantProps) {
  if (page === "cover") {
    const c = copy.cover
    return (
      <div className="vc vc-cover">
        <div className="vc-cover-band">
          <span className="vc-eyebrow">{c.eyebrow}</span>
          <p className="vc-meta">
            <span className="vc-name">{c.byline}</span>
            {c.meta}
          </p>
        </div>
        <div className="vc-cover-main">
          <h1 className="vc-title">{c.title}</h1>
          <p className="vc-sub">{c.subtitle}</p>
        </div>
      </div>
    )
  }

  if (page === "compare") {
    const c = copy.compare
    return (
      <div className="vc">
        <span className="vc-eyebrow">{c.eyebrow}</span>
        <h1 className="vc-title">{c.headline}</h1>
        <div className="vc-content">
          <div className="vc-cols">
            {c.columns.map((column, index) => (
              <div
                key={column.label}
                className={
                  c.chosen === index ? "vc-panel is-chosen" : "vc-panel"
                }
              >
                <p className="vc-panel-label">
                  <span>{column.label}</span>
                  {c.chosen === index ? (
                    <span>{lang === "zh" ? "選定" : "Chosen"}</span>
                  ) : null}
                </p>
                <ul className="vc-points">
                  {column.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {c.tradeoff ? (
            <div className="vc-tradeoff">
              <div>
                <b>{lang === "zh" ? "理由" : "Why"}</b>
                {c.tradeoff.why}
              </div>
              <div>
                <b>{lang === "zh" ? "代價" : "Cost"}</b>
                {c.tradeoff.cost}
              </div>
            </div>
          ) : null}
          <Boundary text={c.boundary} />
        </div>
        <Footer copy={copy} page={copy.pageNumbers.compare} />
      </div>
    )
  }

  if (page === "table") {
    const c = copy.table
    return (
      <div className="vc">
        <span className="vc-eyebrow">{c.eyebrow}</span>
        <h1 className="vc-title">{c.headline}</h1>
        <div className="vc-content">
          <table className="vc-table">
            <thead>
              <tr>
                {c.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={index === c.refColumn ? "is-ref" : ""}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Boundary text={c.boundary} />
        </div>
        <Footer copy={copy} page={copy.pageNumbers.table} />
      </div>
    )
  }

  const c = copy.closing
  return (
    <div className="vc">
      <span className="vc-eyebrow">{c.eyebrow}</span>
      <h1 className="vc-title">{c.headline}</h1>
      <div className="vc-content">
        <div className="vc-pills">
          {c.takeaways.map((item) => (
            <div key={item.ref} className="vc-pill">
              <b>{item.ref}</b>
              {item.text}
            </div>
          ))}
        </div>
        <p className="vc-contact">
          <b>{lang === "zh" ? "謝謝" : "Thank you"}</b>
          {c.closingLine}
        </p>
      </div>
      <Footer copy={copy} page={copy.pageNumbers.closing} />
    </div>
  )
}
