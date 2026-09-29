import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { defaultPageNumberVisibility, type Deck } from "@/lib/deck"
import { setPageShowPageNumber } from "@/lib/deck-editor"

type PageNumberSelectProps = {
  deck: Deck
  pageIndex: number
  disabled?: boolean
  onChange: (update: (deck: Deck) => Deck) => void
}

// Select 只收字串；頁面欄位以 undefined 表示沿用週層級預設
const OVERRIDE_BY_CHOICE = {
  default: undefined,
  show: true,
  hide: false,
} as const satisfies Record<string, boolean | undefined>

type PageNumberChoice = keyof typeof OVERRIDE_BY_CHOICE

const CHOICES = Object.keys(OVERRIDE_BY_CHOICE) as PageNumberChoice[]

function choiceFor(override: boolean | undefined): PageNumberChoice {
  return (
    CHOICES.find((choice) => OVERRIDE_BY_CHOICE[choice] === override) ??
    "default"
  )
}

function isPageNumberChoice(value: unknown): value is PageNumberChoice {
  return typeof value === "string" && Object.hasOwn(OVERRIDE_BY_CHOICE, value)
}

function visibilityLabel(visible: boolean): string {
  return visible ? "Show" : "Hide"
}

// HTML Page 的預設與週層級設定不同，Default 須標出實際結果，作者才知道會不會疊頁碼
function choiceLabel(choice: PageNumberChoice, defaultVisible: boolean) {
  const override = OVERRIDE_BY_CHOICE[choice]
  return override === undefined
    ? `Default (${visibilityLabel(defaultVisible)})`
    : visibilityLabel(override)
}

export function PageNumberSelect({
  deck,
  pageIndex,
  disabled = false,
  onChange,
}: PageNumberSelectProps) {
  const page = deck.pages[pageIndex]
  const defaultVisible = page ? defaultPageNumberVisibility(deck, page) : true

  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <Label
        htmlFor="page-number-visibility"
        className={
          disabled ? "cursor-not-allowed text-muted-foreground" : undefined
        }
      >
        Page number
      </Label>
      <Select
        value={choiceFor(page?.showPageNumber)}
        disabled={disabled}
        onValueChange={(value) => {
          if (!isPageNumberChoice(value)) return
          onChange((currentDeck) =>
            setPageShowPageNumber(
              currentDeck,
              pageIndex,
              OVERRIDE_BY_CHOICE[value]
            )
          )
        }}
      >
        <SelectTrigger id="page-number-visibility" className="w-full">
          <SelectValue>
            {(value: string | null) =>
              choiceLabel(
                isPageNumberChoice(value) ? value : "default",
                defaultVisible
              )
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CHOICES.map((choice) => (
            <SelectItem key={choice} value={choice}>
              {choiceLabel(choice, defaultVisible)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
