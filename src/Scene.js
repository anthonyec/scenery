import EventEmitter from './EventEmitter';

function createTimeTracker(samples = 50, budget = 16) {
  let index = 0;
  const times = new Array(samples).fill(0);

  return (time) => {
    times[index] = time;

    if (index >= times.length - 1) {
      index = 0;
    } else {
      index += 1;
    }

    const total = times.reduce((mem, value) => {
      return mem + value;
    }, 0);

    const average = total / times.length;
    const costPercent = ((average / budget) * 100).toFixed(1) + '%';

    console.log('average (ms):', average.toFixed(2), 'cost:', costPercent);
  }
}

const track = createTimeTracker(50, 10);

export default class Scene extends EventEmitter {
  idCounter = 0;
  displayList = {};

  constructor(options) {
    super();

    this.clearRectPadding = 1;
    this.canvasWidth = options.canvas.width;
    this.canvasHeight = options.canvas.height;
    this.context = options.canvas.getContext('2d');
  }

  init() {}

  add(sceneObject) {
    const id = `object_${this.idCounter}`;

    this.displayList[id] = sceneObject;

    this.idCounter += 1;
  }

  get(sceneObjectId) {
    return this.displayList[sceneObjectId];
  }

  getAll(sceneObjectIds = []) {
    return sceneObjectIds.map((sceneObjectId) => {
      return this.get(sceneObjectId);
    });
  }

  query(params) {}

  hit(x, y, options = {}) { }

  hitWithinBounds(x, y, width, height, options = {}) {}

  draw() {
    const startDrawTime = window.performance.now();

    const dirtyObjectIds = this._getDirtyObjectIds();
    const hasDirtyObjects = dirtyObjectIds.length > 0;

    if (hasDirtyObjects) {
      this.dirtyBounds = this._getBoundsForObjects(dirtyObjectIds, true);

      this.context.clearRect(
        this.dirtyBounds.x - this.clearRectPadding,
        this.dirtyBounds.y - this.clearRectPadding,
        this.dirtyBounds.width + this.clearRectPadding * 2,
        this.dirtyBounds.height + this.clearRectPadding * 2
      );

      // Debug clearing rect position.
      // this.context.strokeStyle = 'red';
      // this.context.strokeRect(
      //   this.dirtyBounds.x,
      //   this.dirtyBounds.y,
      //   this.dirtyBounds.width,
      //   this.dirtyBounds.height
      // );

      // this.context.stroke();

      dirtyObjectIds.forEach((sceneObjectId) => {
        const object = this.get(sceneObjectId);

        object.draw({
          context: this.context
        });
      });
    }

    const endDrawTime = window.performance.now();
    const totalDrawTime = endDrawTime - startDrawTime;

    track(totalDrawTime);
  }

  _forEachSceneObject(func) {
    Object.keys(this.displayList).forEach((sceneObjectId, index) => {
      const object = this.get(sceneObjectId);

      func(object, index);
    });
  }

  _getBoundsForObjects(sceneObjectIds = [], usePrevProps = false) {
    const props = usePrevProps ? 'prevProps' : 'props';

    const objects = this.getAll(sceneObjectIds);
    const objectLeftPositions = objects.map((object) => object[props].x);
    const objectTopPositions = objects.map((object) => object[props].y);
    const objectRightPositions = objects.map((object) => object[props].x + object[props].width);
    const objectBottomPositions = objects.map((object) => object[props].y + object[props].height);

    const minX = Math.min(...objectLeftPositions);
    const maxX = Math.max(...objectRightPositions);

    const minY = Math.min(...objectTopPositions);
    const maxY = Math.max(...objectBottomPositions);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  _getDirtyObjectIds() {
    return Object.keys(this.displayList).filter((sceneObjectId) => {
      const object = this.get(sceneObjectId);

      return object.isDirty;
    });
  }

  _update() {}
  _move(id, layerIndex) {}
  _remove(id) {}
}