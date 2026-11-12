"""Subset and rename Source Han Serif under the SIL Open Font License."""
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

source, text_file, output = sys.argv[1:]
options = subset.Options()
options.flavor = "woff2"
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
font = subset.load_font(source, options)
subsetter = subset.Subsetter(options=options)
with open(text_file, encoding="utf-8") as handle:
    subsetter.populate(text=handle.read())
subsetter.subset(font)
for name_id, value in [(1, "Witlu Song"), (2, "SemiBold"), (3, "WitluSong-SemiBold-Subset"), (4, "Witlu Song SemiBold"), (6, "WitluSong-SemiBold")]:
    for record in list(font["name"].names):
        if record.nameID == name_id:
            font["name"].setName(value, name_id, record.platformID, record.platEncID, record.langID)
if "CFF " in font:
    cff = font["CFF "].cff
    cff.fontNames = ["WitluSong-SemiBold"]
    for top_dict in cff.topDictIndex:
        top_dict.FamilyName = "Witlu Song"
        top_dict.FullName = "Witlu Song SemiBold"
        if hasattr(top_dict, "FDArray"):
            for font_dict in top_dict.FDArray:
                if hasattr(font_dict, "FontName"):
                    font_dict.FontName = font_dict.FontName.replace("SourceHanSerifSC", "WitluSong")
subset.save_font(font, output, options)
with TTFont(output) as check:
    assert check.flavor == "woff2"
    assert check["name"].getDebugName(1) == "Witlu Song"
    if "CFF " in check:
        assert check["CFF "].cff.fontNames == ["WitluSong-SemiBold"]
print(output)
