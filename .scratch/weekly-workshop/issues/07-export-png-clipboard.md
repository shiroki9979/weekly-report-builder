# 07: Export visible pages as PNG and clipboard

**What to build:** The user can download each non-hidden page as a PNG (`YYYY-MM-DD-p02.png`) or copy that image to the clipboard. If clipboard write fails, download still works.

**Blocked by:** 02: Edit a week in the workshop and save

**Status:** done

- [x] Hidden pages are skipped in export
- [x] Download produces one PNG per visible page with the agreed filename
- [x] Copy-to-clipboard puts the current visible page image on the clipboard
- [x] Clipboard failure leaves download available and surfaces an error
- [x] Tests cover skip-hidden and filename; clipboard may be stubbed at the seam

## Comments
