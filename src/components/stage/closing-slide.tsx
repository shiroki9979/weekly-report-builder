import type { ClosingPage } from "@/lib/deck"
import type { StagePageContext } from "@/lib/stage-page-context"
import { EditorialFrame } from "./editorial-frame"

type Props = { page: ClosingPage; context: StagePageContext }

export function ClosingSlide({ page, context }: Props) {
  return (
    <EditorialFrame
      eyebrow={page.eyebrow.trim() || "Closing"}
      headline={page.title}
      context={context}
      boundary={page.boundary}
    >
      <div className="editorial-closing">
        {page.takeaways.length > 0 ? (
          <ul className="editorial-takeaways">
            {page.takeaways.map((takeaway, index) => (
              <li key={index}>
                <p>{takeaway.text}</p>
                {takeaway.ref ? (
                  <span className="editorial-takeaway-ref">{takeaway.ref}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {page.closingLine ? (
          <p className="editorial-closing-line">{page.closingLine}</p>
        ) : null}
      </div>
    </EditorialFrame>
  )
}
