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

const track = createTimeTracker(50, 16);

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

    sceneObject.id = id;

    this.idCounter += 1;
  }

  get(sceneObjectId) {
    return this.displayList[sceneObjectId];
  }

  getAll(sceneObjectIds = []) {
    const ids = sceneObjectIds.length === 0 ?
      Object.keys(this.displayList) :
      sceneObjectIds;

    return ids.map((sceneObjectId) => {
      return this.get(sceneObjectId);
    });
  }

  query(params) {}

  hit(x, y) {
    const objects = this.getAll();

    return objects.filter((object) => {
      return x >= object.props.x
          && y >= object.props.y
          && x <= object.props.x + object.props.width
          && y <= object.props.y + object.props.height;
    });
  }

  hitWithinBounds(x, y, width, height) {
    const objects = this.getAll();

    return objects.filter((object) => {
      const leftEdgeA = x;
      const rightEdgeA = x + width

      const leftEdgeB = object.props.x;
      const rightEdgeB = (object.props.x + object.props.width);

      const topEdgeA = y;
      const bottomEdgeA = y + height;

      const topEdgeB = object.props.y;
      const bottomEdgeB = (object.props.y + object.props.height);

      const leftRightEdgeCheck = (rightEdgeA > leftEdgeB && leftEdgeA < rightEdgeB);
      const topBottomEdgeCheck = (bottomEdgeA > topEdgeB && topEdgeA < bottomEdgeB);

      return leftRightEdgeCheck &&  topBottomEdgeCheck;
    });
  }

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

      const hits = this.hitWithinBounds(
        this.dirtyBounds.x,
        this.dirtyBounds.y,
        this.dirtyBounds.width,
        this.dirtyBounds.height
      );

      [...hits, ...this.getAll(dirtyObjectIds)].forEach((object) => {
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
