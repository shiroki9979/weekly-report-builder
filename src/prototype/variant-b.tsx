// PROTOTYPE — Variant B「Observatory」：系統化標記：等寬字型的索引、刻度細線、編號要點、欄位以細線分隔、chosen 以上緣粗線標示
import type { DeckCopy, VariantProps } from "./types"

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

function Head({
  copy,
  page,
  eyebrow,
}: {
  copy: DeckCopy
  page: number
  eyebrow: string
}) {
  return (
    <div className="vb-head">
      <span>
        <span className="vb-index">§ {pad(page)}</span>
        {eyebrow}
      </span>
      <span>{copy.deckTitle}</span>
    </div>
  )
}

function Footer({ copy, page }: { copy: DeckCopy; page: number | null }) {
  return (
    <div className="vb-footer">
      <span>{copy.deckTitle}</span>
      {page !== null ? (
        <span className="vb-pg">
          {pad(page)} / {pad(copy.pageTotal)}
        </span>
      ) : null}
    </div>
  )
}

function Boundary({ text }: { text: string }) {
  const [head, ...rest] = text.split(/[:：]/)
  return (
    <p className="vb-boundary">
      <b>{head}</b>
      <span>{rest.join(":").trim()}</span>
    </p>
  )
}

export function VariantB({ page, copy, lang }: VariantProps) {
  if (page === "cover") {
    const c = copy.cover
    return (
      <div className="vb vb-cover">
        <div className="vb-head">
          <span>
            <span className="vb-index">§ 00</span>
            {c.eyebrow}
          </span>
          <span>{copy.deckTitle}</span>
        </div>
        <div className="vb-ruler" />
        <h1 className="vb-title">{c.title}</h1>
        <p className="vb-sub">{c.subtitle}</p>
        <div className="vb-meta">
          <div className="vb-meta-cell">
            <small>{lang === "zh" ? "講者" : "Presenter"}</small>
            {c.byline}
          </div>
          <div className="vb-meta-cell">
            <small>{lang === "zh" ? "脈絡" : "Context"}</small>
            {c.meta}
          </div>
          <div className="vb-meta-cell">
            <small>{lang === "zh" ? "頁數" : "Pages"}</small>
            {pad(copy.pageTotal)}
          </div>
        </div>
        <Footer copy={copy} page={null} />
      </div>
    )
  }

  if (page === "compare") {
    const c = copy.compare
    return (
      <div className="vb">
        <Head copy={copy} page={copy.pageNumbers.compare} eyebrow={c.eyebrow} />
        <div className="vb-ruler" />
        <h1 className="vb-title">{c.headline}</h1>
        <div className="vb-content">
          <div className="vb-cols">
            {c.columns.map((column, index) => (
              <div
                key={column.label}
                className={c.chosen === index ? "vb-col is-chosen" : "vb-col"}
                style={index === 1 ? { gridColumn: 3 } : undefined}
              >
                <p className="vb-label">
                  <span>
                    {String.fromCharCode(65 + index)} · {column.label}
                  </span>
                  {c.chosen === index ? (
                    <span className="vb-tag">
                      {lang === "zh" ? "選定" : "Chosen"}
                    </span>
                  ) : null}
                </p>
                <ul className="vb-points">
                  {column.points.map((point, pointIndex) => (
                    <li key={point}>
                      <i>{pad(pointIndex + 1)}</i>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="vb-divider" style={{ gridColumn: 2, gridRow: 1 }} />
          </div>
          {c.tradeoff ? (
            <dl className="vb-tradeoff">
              <dt>{lang === "zh" ? "理由" : "Why"}</dt>
              <dd>{c.tradeoff.why}</dd>
              <dt>{lang === "zh" ? "代價" : "Cost"}</dt>
              <dd>{c.tradeoff.cost}</dd>
            </dl>
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
      <div className="vb">
        <Head copy={copy} page={copy.pageNumbers.table} eyebrow={c.eyebrow} />
        <div className="vb-ruler" />
        <h1 className="vb-title">{c.headline}</h1>
        <div className="vb-content">
          <table className="vb-table">
            <thead>
              <tr>
                {c.columns.map((column, index) => (
                  <th
                    key={column}
                    className={index === c.refColumn ? "is-ref" : ""}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row, rowIndex) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={index === c.refColumn ? "is-ref" : ""}
                    >
                      {index === 0 ? <i>{pad(rowIndex + 1)}</i> : null}
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
    <div className="vb">
      <Head copy={copy} page={copy.pageNumbers.closing} eyebrow={c.eyebrow} />
      <div className="vb-ruler" />
      <h1 className="vb-title">{c.headline}</h1>
      <div className="vb-content">
        <ul className="vb-index-list">
          {c.takeaways.map((item) => (
            <li key={item.ref}>
              <b>§ {item.ref}</b>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <p className="vb-contact">{c.closingLine}</p>
      </div>
      <Footer copy={copy} page={copy.pageNumbers.closing} />
    </div>
  )
}
