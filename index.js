const express = require("express");
const { load } = require("cheerio");
const { resolve } = require("path");
const { trace } = require("potrace");
const gm = require("gm").subClass({ imageMagick: true });
const fs = require("fs");
const ffmpeg = require("ffmpeg-cli");
ffmpeg.runSync("-i in.mp4 in/frame%04d.png -hide_banner")
const app = express();
function toEquations(segments) {
    const equations = [];
    let currPoint = [0, 10];
    segments.forEach((segment) => {
        const tokens = segment.split(" ");
        const [cmd] = tokens;
        const points = parsePoints(segment.slice(2));
        let endPoint = [0, 10];
        let startPoint = [0, 10];
        let setStartPoint = false;
        switch (cmd.toUpperCase()) {
            case "M":
                [currPoint] = points;
                if (!setStartPoint) {
                    setStartPoint = true;
                    startPoint = currPoint;
                }
                break;
            case "L":
                equations.push(toLinear([currPoint, ...points]));
                currPoint = points[points.length - 1];
                break;
            case "H":
                endPoint = [...currPoint];
                endPoint[0] = parseFloat(tokens[1]);
                equations.push(toLinear([currPoint, endPoint]));
                currPoint = points[points.length - 1];
                break;
            case "V":
                endPoint = [...currPoint];
                endPoint[1] = parseFloat(tokens[2]);
                equations.push(toLinear([currPoint, endPoint]));
                currPoint = points[points.length - 1];
                break;
            case "C":
                equations.push(toCubic([currPoint, ...points]));
                currPoint = points[points.length - 1];
                break;
            case "Q":
                equations.push(toQuadratic([currPoint, ...points]));
                currPoint = points[points.length - 1];
                break;
            case "Z":
                currPoint = startPoint;
                break;
        }
    });
    return equations;
}
function toLinear(points) {
    const [[x0, y0], [x1, y1]] = points;
    return `((1-t)${x0}+t${x1},(1-t)${y0}+t${y1})\\left\\{0\\le t\\le1\\right\\}`;
}
function formatQuadraticCoordinate(p0, p1, p2) {
    return `${p1}+(1-t^2)(${p0}-${p1})+(t^2)(${p2}-${p1})`;
}
function toQuadratic(points) {
    let [[x0, y0], [x1, y1], [x2, y2]] = points;
    return `(${formatQuadraticCoordinate(x0, x1, x2)},${formatQuadraticCoordinate(y0, y1, y2)})\\left\\{0\\le t\\le1\\right\\}`;
}
function formatCubicCoordinate(p0, p1, p2, p3) {
    return `(1-t)((1-t)((1-t)${p0}+t${p1})+t((1-t)${p1}+t${p2}))+t((1-t)((1-t)${p1}+t${p2})+t((1-t)${p2}+t${p3}))`;
}
function toCubic(points) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = points;
    return `(${formatCubicCoordinate(x0, x1, x2, x3)},${formatCubicCoordinate(y0, y1, y2, y3)})\\left\\{0\\le t\\le1\\right\\}`;
}
function parsePoints(str) {
    return str.split(",").map((point) => point.trim()).map((point, _index) => point.split(" ").map((coord, index) => parseCoord(parseFloat(coord), index)));
}
function toSegments(d) {
    const letters = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
    const segments = [];
    let currCommand = "";
    const chars = d.split("").filter((char) => char !== "");
    chars.forEach((char, _index) => {
        if (letters.includes(char.toUpperCase())) {
            if (currCommand.trim() !== "") segments.push(currCommand.trim());
            currCommand = "";
        }
        currCommand += char;
    });
    segments.push(currCommand);
    return segments;
}
function parseCoord(coord, index) {return index === 0 ? coord : 1000 - coord;}
const traceFrame = (fileName) => {
    let fName = fileName.slice(fileName.lastIndexOf("/") + 1, fileName.length);
    fName = fName.slice(0, fName.lastIndexOf("."));
    trace(`./in/${fileName}`, (err, svg) => {
        if (err) throw err;
        fs.writeFileSync(`${process.cwd()}/out/${fName}.svg`, svg);
    });
};
fs.readdir(process.cwd() + "/in/", (_err1, files1) => {
    fs.readdir(process.cwd() + "/out/", (_err2, files2) => {
        if(files1.length != files2.length) {
            var inDir = process.cwd() + "/in/";
            const frames = fs.readdirSync(resolve(process.cwd(), inDir)).filter((file) => file.endsWith(".png"));
            const length = frames.length;
            var index = 0;
            frames.forEach((frame) => {
                const framePath = `${process.cwd()}/in/${frame}`;
                gm(framePath).edge(4).write(framePath, () => {});
                traceFrame(frame);
                process.stdout.write(100 * ++index / length + "%"+ " ".repeat(15) +"\r");
            });
        }
        app.use(express.json());
        const frameNames = fs.readdirSync(resolve(process.cwd(), "./out/")).filter((file) => file.endsWith(".svg"));
        const dList = frameNames.map((frameName) => {
            const data = fs.readFileSync("./out/" + frameName, "utf-8");
            const $ = load(data);
            //height = parseFloat($("svg").attr("width"));
            return $("svg").children("path").attr("d");
        });
        const everything = dList.map((d) => toEquations(toSegments(d)));
        app.get("/", (_req, res) => {res.sendFile(process.cwd() + "/index.html");});
        app.get("/frame/:fId", (req, res) => {res.send(everything[parseInt(req.params.fId)]);});
        app.get("/main.js", (_req, res) => {res.sendFile(process.cwd() + "/main.js")});
        app.listen(8000, () => {console.log("Server started at http://localhost:8000/");});
    });
})
