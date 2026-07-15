"use strict"

var fs = require("fs")
var path = require("path")
var fallback = require("../../js/calc_ui/sprite_fallback.js")

describe("player box sprite fallback", function () {
    test("tries the requested style, alternate styles, and then the default image", function () {
        var paths = fallback.candidates("lombre", "pokesprite")

        expect(paths).toEqual([
            "./img/pokesprite/lombre.png",
            "./img/newhd/lombre.png",
            "./img/default.png"
        ])
    })

    test("sanitizes sprite names before placing them in HTML", function () {
        var attributes = fallback.attributes('bad" onerror="alert(1)')

        expect(attributes).not.toContain('bad" onerror="alert(1)')
        expect(attributes).toContain('data-sprite-name="badonerroralert1"')
        expect(attributes).toContain('onerror="boxSpriteFallback.handleError(this)"')
    })

    test.each([
        ["screamtail", "scream-tail"],
        ["ironboulder", "iron-boulder"],
        ["zygarde-10%", "zygarde-10"],
        ["necrozma-dusk-mane", "necrozma-duskmane"]
    ])("resolves known filename mismatch %s", function (spriteName, alias) {
        expect(fallback.candidates(spriteName, "pokesprite")).toContain(`./img/pokesprite/${alias}.png`)
    })

    test.each([
        ["Alcremie-Mega", "alcremie"],
        ["Aegislash-Both", "aegislash"],
        ["Pikachu-Flying", "pikachu"],
        ["Pikachu-Surfing", "pikachu"],
        ["Toxtricity-Mega", "toxtricity"],
        ["Zebstrika-Sevii", "zebstrika"]
    ])("falls back from unsupported custom form %s", function (spriteName, alias) {
        expect(fallback.candidates(spriteName, "pokesprite")).toContain(`./img/pokesprite/${alias}.png`)
    })

    test("falls back from a missing battle sprite to the box sprite", function () {
        expect(fallback.candidates("chien-pao", "front", "gif")).toEqual(expect.arrayContaining([
            "./img/front/chienpao.gif",
            "./img/pokesprite/chien-pao.png",
            "./img/default.png"
        ]))
    })

    test.each(["lombre", "burmy"])("has both local sprite variants for %s", function (spriteName) {
        var imageRoot = path.resolve(__dirname, "../../img")

        expect(fs.existsSync(path.join(imageRoot, "pokesprite", spriteName + ".png"))).toBe(true)
        expect(fs.existsSync(path.join(imageRoot, "newhd", spriteName + ".png"))).toBe(true)
    })
})
