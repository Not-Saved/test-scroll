import "./style.css";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d")!;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const dynamicFrames: number[] = [];
const dynamicFramesReproc: number[] = [];
const springFrames: number[] = [];

const wheelFrames: number[] = [];
const scrollFrames: number[] = [];

let isPaused = false;

document.addEventListener("keydown", (event) => {
  if (event.key === "p") {
    isPaused = !isPaused;
  }
});

class SecondOrderDynamics {
  private xp: number; // previous input
  private y: number; // position
  private yd: number; // velocity
  private k1: number; // dynamics constant
  private k2: number; // dynamics constant
  private k3: number; // dynamics constant

  constructor(f: number, z: number, r: number, x0: number) {
    // compute constants
    this.k1 = z / (Math.PI * f);
    this.k2 = 1 / (2 * Math.PI * f * (2 * Math.PI * f));
    this.k3 = (r * z) / (2 * Math.PI * f);

    // initialize variables
    this.xp = x0;
    this.y = x0;
    this.yd = 0;
  }

  public update(T: number, x: number, xd?: number): number {
    if (xd === undefined) {
      // estimate velocity
      xd = (x - this.xp) / T;
      this.xp = x;
    }
    const k2_stable = Math.max(
      this.k2,
      (T * T) / 2 + (T * this.k1) / 2,
      T * this.k1
    ); // clamp k2 to guarantee stability

    this.y = this.y + T * this.yd; // integrate position by velocity

    this.yd =
      this.yd +
      (T * (x + this.k3 * xd - this.y - this.k1 * this.yd)) / k2_stable; // integrate velocity by acceleration

    return this.y;
  }
}

class Spring {
  private position: number;
  private velocity: number;
  private target: number;
  private stiffness: number;
  private damping: number;

  constructor(stiffness: number, damping: number, initialPosition: number) {
    this.position = initialPosition;
    this.velocity = 0;
    this.target = initialPosition;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  public setTarget(target: number) {
    this.target = target;
  }

  public update(deltaTime: number) {
    const force = this.stiffness * (this.target - this.position);
    const dampingForce = this.damping * this.velocity;
    const acceleration = (force - dampingForce) / 1; // mass is 1
    this.velocity += acceleration * deltaTime;
    this.position += this.velocity * deltaTime;
    return this.position;
  }
}
const appDiv = document.getElementById("app")!;
if (appDiv) {
  const words =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(100);
  appDiv.innerText = words;
}

const dynamic = new SecondOrderDynamics(
  2,
  1,
  1,
  (window.scrollY / (appDiv.clientHeight - window.innerHeight)) * 100
);
const dynamicReproc = new SecondOrderDynamics(
  2,
  1,
  1,
  (window.scrollY / (appDiv.clientHeight - window.innerHeight)) * 100
);

const scrollDynamic = new SecondOrderDynamics(
  2,
  1,
  1,
  (window.scrollY / (appDiv.clientHeight - window.innerHeight)) * 100
);
const scrollDynamic2 = new SecondOrderDynamics(
  2,
  1,
  1,
  (window.scrollY / (appDiv.clientHeight - window.innerHeight)) * 100
);

const spring = new Spring(
  310,
  30,
  (window.scrollY / (appDiv.clientHeight - window.innerHeight)) * 100
);

function drawGraph(data: any, color: any, drawAsRect: boolean = false) {
  if (drawAsRect) {
    ctx.fillStyle = color;
    data.forEach((value: any, index: any) => {
      const x = index * 4; // Scale x coordinate
      const y = canvas.height - (canvas.height / 100) * value;
      ctx.fillRect(x, y, 2, 2); // Draw each point as a 2x2 rectangle
    });
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value: any, index: any) => {
      const x = index * 4; // Scale x coordinate
      const y = canvas.height - (canvas.height / 100) * value;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }
}

let whellScrollY = window.scrollY;
let scrollY = window.scrollY;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
});

window.addEventListener("wheel", (event) => {
  const newScroll = whellScrollY + event.deltaY;
  whellScrollY = clamp(newScroll, 0, appDiv.clientHeight - window.innerHeight);
});

function generateScrollValue() {
  return (whellScrollY / (appDiv.clientHeight - window.innerHeight)) * 100;
}
function generateScrollValue2() {
  return (scrollY / (appDiv.clientHeight - window.innerHeight)) * 100;
}

let lastFrameTime = 0;
function drawFrame(currentTime: number) {
  let deltaTime = currentTime - lastFrameTime || 1000 / 60;

  lastFrameTime = currentTime;
  if (isPaused || document.hidden) {
    requestAnimationFrame(drawFrame);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Generate new frame values
  const wheelValue = generateScrollValue();
  const scrollValue = generateScrollValue2();
  // Add new values to the arrays
  wheelFrames.push(wheelValue);
  scrollFrames.push(scrollValue);
  // Remove the least recent values if arrays are longer than canvas width
  if (wheelFrames.length > canvas.width / 4) wheelFrames.shift();
  if (scrollFrames.length > canvas.width / 4) scrollFrames.shift();

  // Generate lerp values based on the blue function
  const dynamicValue = dynamic.update(deltaTime / 1000, wheelValue);
  dynamicFrames.push(dynamicValue);
  if (dynamicFrames.length > canvas.width / 4) dynamicFrames.shift();

  const dynamycReprocValue = dynamicReproc.update(
    deltaTime / 1000,
    dynamicValue
  );
  dynamicFramesReproc.push(dynamycReprocValue);
  if (dynamicFramesReproc.length > canvas.width / 4)
    dynamicFramesReproc.shift();

  // Remove the least recent values if arrays are longer than canvas width

  // Update spring value
  spring.setTarget(wheelValue);
  const springValue = spring.update(deltaTime / 1000);
  springFrames.push(springValue);

  // Remove the least recent values if arrays are longer than canvas width
  if (springFrames.length > canvas.width / 4) springFrames.shift();

  drawGraph(dynamicFrames, "blue");
  drawGraph(dynamicFramesReproc, "green");

  drawGraph(wheelFrames, "red", true); // Draw as rectangles
  drawGraph(scrollFrames, "orange", true); // Draw as rectangles
  //drawGraph(frameData3, 'green');

  const scrollYDyn = scrollDynamic.update(deltaTime / 1000, whellScrollY);
  const scrollYDynReproc = scrollDynamic2.update(deltaTime / 1000, scrollYDyn);

  //appDiv!.style.transform = `translateY(${-scrollYDynReproc}px)`;

  requestAnimationFrame(drawFrame);
}

drawFrame(0);
