const elt = document.getElementsByTagName("div")[0];
const calculator = Desmos.GraphingCalculator(elt);
calculator.setMathBounds({left: 0, right: 1000, bottom: 0, top: 1000});
const blank = calculator.getState();
calculator.setDefaultState(blank);
function renderFrame(frame, skip = 0) {
    fetch("http://localhost:8000/frame/" + frame++).then(res => res.json()).then(res => {
        calculator.setState(blank);
        res.forEach((equation, index) => {calculator.setExpression({ id: (index).toString(), latex: equation, color: "#2d70b3" });});
        setTimeout(() => {renderFrame(frame + skip);}, 300);
    })
}
renderFrame(0).catch(() => {})