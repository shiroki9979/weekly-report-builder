// PROTOTYPE — Variant A「Rule」：最接近手刻 Deck 的編輯式外框：左側 accent bar、無分隔線、圓角卡片、頁尾 Deck Title 加強調色頁碼
import type { DeckCopy, VariantProps } from "./types"

function Footer({ copy, page }: { copy: DeckCopy; page: number | null }) {
  return (
    <div className="va-footer">
      <span>{copy.deckTitle}</span>
      {page !== null ? <span className="va-pg">{page}</span> : null}
    </div>
  )
}

function Boundary({ text }: { text: string }) {
  const [head, ...rest] = text.split(/[:：]/)
  return (
    <p className="va-boundary">
      <b>{head}</b> {rest.join(":").trim()}
    </p>
  )
}

export function VariantA({ page, copy, lang }: VariantProps) {
  if (page === "cover") {
    const c = copy.cover
    return (
      <div className="va va-cover">
        <p className="va-eyebrow">{c.eyebrow}</p>
        <h1 className="va-title">{c.title}</h1>
        <p className="va-sub">{c.subtitle}</p>
        <div className="va-who">
          <span className="va-name">{c.byline}</span>
          <span className="va-meta">{c.meta}</span>
        </div>
        <Footer copy={copy} page={null} />
      </div>
    )
  }

  if (page === "compare") {
    const c = copy.compare
    return (
      <div className="va">
        <p className="va-eyebrow">{c.eyebrow}</p>
        <h1 className="va-title">{c.headline}</h1>
        <div className="va-content">
          <div className="va-cols">
            {c.columns.map((column, index) => (
              <div
                key={column.label}
                className={c.chosen === index ? "va-card is-chosen" : "va-card"}
              >
                <p className="va-pane-title">{column.label}</p>
                <ul className="va-points">
                  {column.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {c.tradeoff ? (
            <p className="va-tradeoff">
              <b>{lang === "zh" ? "理由" : "Why"}</b> {c.tradeoff.why}{" "}
              <b>{lang === "zh" ? "代價" : "Cost"}</b> {c.tradeoff.cost}
            </p>
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
      <div className="va">
        <p className="va-eyebrow">{c.eyebrow}</p>
        <h1 className="va-title">{c.headline}</h1>
        <div className="va-content">
          <table className="va-table">
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
    <div className="va">
      <p className="va-eyebrow">{c.eyebrow}</p>
      <h1 className="va-title">{c.headline}</h1>
      <div className="va-content">
        <div className="va-chips">
          {c.takeaways.map((item) => (
            <span key={item.ref} className="va-chip">
              <b>{item.ref}</b>
              {item.text}
            </span>
          ))}
        </div>
        <p className="va-tradeoff va-closing-line">
          <b>{lang === "zh" ? "謝謝" : "Thank you"}</b> {c.closingLine}
        </p>
      </div>
      <Footer copy={copy} page={copy.pageNumbers.closing} />
    </div>
  )
}
