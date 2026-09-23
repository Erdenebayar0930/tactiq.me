"""КОД ДАХЬ МОНГОЛ БИЧВЭРИЙГ `t()` РҮҮ ОРУУЛНА.

⚠ ЗӨВХӨН ХОЁР АЮУЛГҮЙ ХЭЛБЭР: (1) цэвэр JSX текст (дотор `{}` байхгүй),
(2) `label="…"`, `placeholder="…"` гэх мэт цагаан жагсаалтад байгаа
атрибут. Бусдыг ОРХИНО — жишээ нь `` `${x} устгах` `` гэсэн template
литерал, `new Date(...).toLocaleString("mn-MN")` зэрэг нь гараар шийдэх
шаардлагатай бөгөөд автоматаар засвал чимээгүй эвдрэл үүснэ.

⚠ ТАЙЛБАР, `import`-ыг ХӨНДӨХГҮЙ: тайлбар дахь монгол бичвэр нь
хөгжүүлэгчид зориулагдсан.

Хэрэглээ:
    python scripts/_i18n_wrap.py <файл…>            — юу засахыг харуулна
    python scripts/_i18n_wrap.py --apply <файл…>    — засаад толийн
                                                      мөрүүдийг хэвлэнэ
"""

import io
import re
import sys

CYRILLIC = re.compile(r"[А-Яа-яӨөҮүЁё]")

# Кодын шинжтэй тэмдэгтүүд — JSX текст эдгээрийг агуулах ёсгүй.
CODEY = ";=()/*" + chr(96) + chr(92)

ATTRS = ("label", "placeholder", "title", "description", "aria-label", "subtitle", "hint", "empty")

# Тайлбарын хүрээг олж, тэднийг хөндөхгүйн тулд масклана.
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"^[ \t]*//.*$", re.M)
JSX_COMMENT = re.compile(r"\{/\*.*?\*/\}", re.S)


def masked_regions(text):
    spans = []
    for pattern in (JSX_COMMENT, BLOCK_COMMENT, LINE_COMMENT):
        for m in pattern.finditer(text):
            spans.append((m.start(), m.end()))
    for m in re.finditer(r"^import .*$", text, re.M):
        spans.append((m.start(), m.end()))
    return spans


def in_masked(pos, spans):
    return any(start <= pos < end for start, end in spans)


def wrap(path, apply):
    src = io.open(path, encoding="utf-8").read()
    spans = masked_regions(src)
    found = []

    def attr_sub(m):
        if in_masked(m.start(), spans):
            return m.group(0)
        name, value = m.group(1), m.group(2)
        if not CYRILLIC.search(value):
            return m.group(0)
        found.append(value)
        return f'{name}={{t("{value}")}}'

    out = re.sub(
        r'\b(' + "|".join(re.escape(a) for a in ATTRS) + r')="([^"\n{}]+)"',
        attr_sub,
        src,
    )

    # JSX текст: >текст<  — дотор `{`, `}`, `<` байхгүй, монгол үсэгтэй
    spans = masked_regions(out)

    def text_sub(m):
        if in_masked(m.start(), spans):
            return m.group(0)
        body = m.group(1)
        stripped = body.strip()
        if not CYRILLIC.search(stripped):
            return m.group(0)
        # ⚠ КОД ОРСОН БАЙЖ МЭДНЭ: `>` ба `<` нь generic (`useApiData<T>`),
        # харьцуулалт, тайлбарын хаалтад ч гардаг тул тэдгээрийн хооронд
        # код бүхэлдээ багтаж болно. Кодын шинжтэй тэмдэгт байвал ОРХИНО —
        # тэднийг гараар шийднэ.
        if any(ch in stripped for ch in CODEY) or len(stripped) > 160:
            return m.group(0)
        # Нэг мөр болгож хураана (JSX нь мөр дамжсан текстийг нэг зай болгодог)
        flat = " ".join(stripped.split())
        found.append(flat)
        return f'>{{t("{flat}")}}<'

    out = re.sub(r">([^<>{}]*[А-Яа-яӨөҮүЁё][^<>{}]*)<", text_sub, out)

    if apply and out != src:
        io.open(path, "w", encoding="utf-8", newline="\n").write(out)

    return found


def main():
    args = sys.argv[1:]
    apply = "--apply" in args
    files = [a for a in args if a != "--apply"]

    all_found = []
    for path in files:
        found = wrap(path, apply)
        if found:
            print(f"{len(found):4d}  {path}")
            all_found.extend(found)

    print(f"\nНИЙТ {len(all_found)} мөр\n")
    seen = set()
    for value in all_found:
        if value in seen:
            continue
        seen.add(value)
        print(f'  "{value}": "",')


if __name__ == "__main__":
    main()
