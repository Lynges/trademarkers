import SVG from "svg.js"
import {
    flattenDeep,
    has,
    range
} from 'lodash'
import * as TextToSVG from "text-to-svg"



const globals = {
    token: {
        size: 40,
        padding: 4
    },
    border: {
        width: 7,
        segments: 24
    },
    text: [
        "0",
        "I",
        "II",
        "III",
        "IV",
        "V"
    ],
    dots: {
        size: 8,
        ringradius: 16
    }
}
var draw = SVG('container').size('500mm', '500mm')

function pather(paths, startX, startY) {

    for (const p of paths) {
        const np = draw.path(`M ${startX}, ${startY} ` + p.path)
        if (has(p, 'class')) {
            np.addClass(p.class)
        }

    }
}

function circlePath(radius) {
    return {
        path: [
            `m ${-radius}, 0`,
            `a ${radius}, ${radius} 0 1, 0 ${radius * 2}, 0`,
            `a ${radius}, ${radius} 0 1, 0 ${(-radius) * 2}, 0`
        ]
    }
}



function circleSectionEnd(radius, fraction, steps) {
    const slice = (Math.PI * 2) * fraction
    const endX = (radius * Math.cos(slice * steps))
    const endY = (radius * Math.sin(slice * steps))
    return [endX, endY]

}

function zigzagPath(result, radiusInner, radiusOuter, count) {

    const currentCount = result.length
    if (count === currentCount) {
        return result
    }
    const currentResult = []
    if (currentCount === 0) {
        currentResult.push(
            `m ${radiusInner} 0`
        )
    }
    const radiusMiddle = radiusInner + ((radiusOuter - radiusInner) / 2)

    const [l1sx, l1sy] = circleSectionEnd(radiusInner, 1 / count, currentCount)
    const [l1ex, l1ey] = circleSectionEnd(radiusMiddle, 1 / count, currentCount)

    const [a1ex, a1ey] = circleSectionEnd(radiusMiddle, 1 / (count * 2), currentCount * 2 + 1)
    const [l2ex, l2ey] = circleSectionEnd(radiusOuter, 1 / (count * 2), currentCount * 2 + 1)

    const [m1ex, m1ey] = circleSectionEnd(radiusInner, 1 / count, currentCount + 1)

    currentResult.push(`
        l ${l1ex - l1sx} ${l1ey - l1sy}
        a ${radiusMiddle} ${radiusMiddle} 0 0 1 ${a1ex - l1ex} ${a1ey - l1ey}
        l ${l2ex - a1ex} ${l2ey - a1ey}
        m ${m1ex - l2ex} ${m1ey - l2ey}
    `)

    return zigzagPath([...result, currentResult], radiusInner, radiusOuter, count)

}

function createDecoband(globals, size) {
    const outerpadding = globals.token.padding
    const radiusInner = size - (globals.border.width + outerpadding)
    const radiusOuter = size - outerpadding
    const outer = circlePath(radiusOuter)
    const inner = circlePath(radiusInner)

    return [inner, outer, circlePath(globals.token.size), {
        path: zigzagPath([], radiusInner, radiusOuter, globals.border.segments).join(" ")
    }]
}

function fillText(globals, txt, startX, startY) {
    const options = {
        x: startX,
        y: startY,
        fontSize: globals.token.size * 1.15,
        attributes: {
            class: "textpath",
            fill: 'black',
            stroke: 'red',
            "stroke-width": '0'
        }
    }
    const metrics = globals.font.getMetrics(txt, options)

    options.x = startX - (metrics.width / 2)
    options.y = startY + (metrics.height / 4)

    const d = globals.font.getD(txt, options)
    return {
        path: d,
        class: "textpath"
    }
}

function fillCirclesCircular(globals, count) {
    const circle = circlePath(globals.dots.size)
    const circles = []
    if (count > 1) {
        range(count).forEach(val => {
            const [x, y] = circleSectionEnd(globals.dots.ringradius, 1 / count, val)
            circles.push({
                path: `m ${x} ${y} ${circle.path}`
            })
        });
    } else {
        circles.push({
            path: circle.path
        })
    }

    return circles
}

function fillCirclesStacked(globals, count) {
    const stackedSize = globals.dots.size
    const shiftAmount = 0.3
    const shiftAdjustment = ((stackedSize * 2 * (count / 2) * shiftAmount) + (stackedSize - (stackedSize * shiftAmount)))
    const circle = circlePath(stackedSize)
    const circles = []
    if (count > 1) {

        range(count).forEach(val => {
            const shift = (stackedSize * 2 * val * shiftAmount) + stackedSize
            const x = shift - shiftAdjustment
            const y = shift - shiftAdjustment
            circles.push({
                path: `m ${x} ${y} ${circle.path}`,
                class: 'stackedCircles'
            })
        });
    } else {
        circles.push({
            path: circle.path,
            class: 'stackedCircles'
        })
    }
    return circles
}

function createToken(globals, type, count, startX, startY) {
    const paths = []
    paths.push(createDecoband(globals, globals.token.size))
    if (type === "numerals" && count !== "0") {
        paths.push(fillText(globals, count, startX, startY))
    } else if (type === "stacked" && count !== 0) {
        paths.push(fillCirclesStacked(globals, count, startX, startY))
    } else if (type === "circular" && count !== 0) {
        paths.push(fillCirclesCircular(globals, count, startX, startY))
    }

    pather(flattenDeep(paths), startX, startY)

}

TextToSVG.load('/Cinzel-Regular.ttf', function (err, textToSVG) {
    globals.font = textToSVG
    const size = (globals.token.size * 2) + globals.token.size / 2
    globals.text.forEach((value, index) => {
        createToken(globals, "numerals", value, size * 2 * (index + 1), size * 2)
        createToken(globals, "circular", index, size * 2 * (index + 1), size * 3)
        createToken(globals, "stacked", index, size * 2 * (index + 1), size * 4)
    })


});