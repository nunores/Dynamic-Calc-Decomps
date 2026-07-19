(function (root, factory) {
    var api = factory()
    if (typeof module === "object" && module.exports) {
        module.exports = api
    }
    root.boxSpriteFallback = api
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict"

    var SPRITE_ASSET_REVISION = "20260719"

    var SPRITE_ALIASES = {
        "aegislash-both": "aegislash",
        "alcremie-mega": "alcremie",
        "chien-pao": "chienpao",
        "gougingfire": "gouging-fire",
        "ironboulder": "iron-boulder",
        "ironcrown": "iron-crown",
        "ironleaves": "iron-leaves",
        "necrozma-dusk-mane": "necrozma-duskmane",
        "pikachu-flying": "pikachu",
        "pikachu-surfing": "pikachu",
        "ragingbolt": "raging-bolt",
        "screamtail": "scream-tail",
        "toxtricity-low-key": "toxtricity-lowkey",
        "toxtricity-mega": "toxtricity",
        "walkingwake": "walking-wake",
        "zebstrika-sevii": "zebstrika",
        "zygarde-10%": "zygarde-10"
    }

    function normalizeSpriteName(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9%_-]/g, "")
    }

    function normalizeStyle(value) {
        var style = String(value || "pokesprite").toLowerCase()
        return /^(?:back|front|newhd|pokesprite)$/.test(style) ? style : "pokesprite"
    }

    function normalizeExtension(value) {
        return String(value || "png").toLowerCase() === "gif" ? "gif" : "png"
    }

    function pushCandidate(candidates, path) {
        if (candidates.indexOf(path) === -1) {
            candidates.push(path)
        }
    }

    function versionSpritePath(path) {
        return `${path}?v=${SPRITE_ASSET_REVISION}`
    }

    function primaryPath(spriteName, spriteStyle, extension) {
        var safeName = normalizeSpriteName(spriteName)
        var style = normalizeStyle(spriteStyle)
        var ext = normalizeExtension(extension || (style === "front" || style === "back" ? "gif" : "png"))
        return versionSpritePath(`./img/${style}/${safeName}.${ext}`)
    }

    function candidates(spriteName, spriteStyle, extension) {
        var safeName = normalizeSpriteName(spriteName)
        var style = normalizeStyle(spriteStyle)
        var ext = normalizeExtension(extension || (style === "front" || style === "back" ? "gif" : "png"))
        var alias = SPRITE_ALIASES[safeName]
        var paths = []

        pushCandidate(paths, primaryPath(safeName, style, ext))
        if (alias) {
            pushCandidate(paths, primaryPath(alias, style, ext))
        }

        if (style !== "pokesprite") {
            pushCandidate(paths, primaryPath(safeName, "pokesprite", "png"))
            if (alias) {
                pushCandidate(paths, primaryPath(alias, "pokesprite", "png"))
            }
        }
        if (style !== "newhd") {
            pushCandidate(paths, primaryPath(safeName, "newhd", "png"))
            if (alias) {
                pushCandidate(paths, primaryPath(alias, "newhd", "png"))
            }
        }

        pushCandidate(paths, versionSpritePath("./img/default.png"))
        return paths
    }

    function handleError(image) {
        var paths = candidates(image.dataset.spriteName, image.dataset.spriteStyle, image.dataset.spriteExtension)
        var currentIndex = Number(image.dataset.spriteFallbackIndex || 0)
        var nextIndex = currentIndex + 1

        if (nextIndex >= paths.length) {
            image.onerror = null
            return
        }

        image.dataset.spriteFallbackIndex = String(nextIndex)
        image.src = paths[nextIndex]
    }

    function bind(image, spriteName, spriteStyle, extension) {
        if (!image) return image

        image.dataset.spriteName = normalizeSpriteName(spriteName)
        image.dataset.spriteStyle = normalizeStyle(spriteStyle)
        image.dataset.spriteExtension = normalizeExtension(extension || (spriteStyle === "front" || spriteStyle === "back" ? "gif" : "png"))
        image.dataset.spriteFallbackIndex = "0"
        image.onerror = function () {
            handleError(image)
        }
        return image
    }

    function attributes(spriteName, spriteStyle, extension) {
        var safeName = normalizeSpriteName(spriteName)
        var style = normalizeStyle(spriteStyle)
        var ext = normalizeExtension(extension || (style === "front" || style === "back" ? "gif" : "png"))
        return `data-sprite-name="${safeName}" data-sprite-style="${style}" data-sprite-extension="${ext}" data-sprite-fallback-index="0" onerror="boxSpriteFallback.handleError(this)"`
    }

    return {
        attributes: attributes,
        bind: bind,
        candidates: candidates,
        handleError: handleError,
        primaryPath: primaryPath,
        normalizeSpriteName: normalizeSpriteName
    }
})
