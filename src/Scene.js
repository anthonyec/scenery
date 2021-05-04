import EventEmitter from "./EventEmitter";

import CanvasRenderer from './CanvasRenderer';

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
    const costPercent = ((average / budget) * 100).toFixed(1) + "%";

    // console.log("average (ms):", average.toFixed(2), "cost:", costPercent);
  };
}

const track = createTimeTracker(50, 16);

export default class Scene extends EventEmitter {
  constructor(options) {
    super();

    this.idCounter = 0;

    this.displayList = {};
    this.displayOrder = [];

    this.canvasWidth = options.canvas.width;
    this.canvasHeight = options.canvas.height;
    this.context = options.canvas.getContext("2d");

    this.renderer = new CanvasRenderer({ context: this.context });
  }

  init() {}

  add(sceneObject) {
    const id = `object_${this.idCounter}`;

    sceneObject.id = id;

    // Add to display list and display order.
    this.displayList[id] = sceneObject;
    this.displayOrder.push(id);

    this.idCounter += 1;
  }

  get(sceneObjectId) {
    return this.displayList[sceneObjectId];
  }

  getAll(sceneObjectIds = []) {
    const shouldGetAll = sceneObjectIds.length === 0;

    if (shouldGetAll) {
      return Object.values(this.displayList);
    }

    return sceneObjectIds.map((sceneObjectId) => {
      return this.get(sceneObjectId);
    });
  }

  hit(x, y) {
    const objects = this.getAll();

    return objects.filter((object) => {
      return (
        x >= object.props.x &&
        y >= object.props.y &&
        x <= object.props.x + object.props.width &&
        y <= object.props.y + object.props.height
      );
    });
  }

  draw() {
    const startDrawTime = window.performance.now();

    const dirtyObjects = this._getDirtyObjects();

    const dirtyObjectPreviousBoundBoxes = this._getObjectsPreviousBoundBox(
      dirtyObjects
    );

    const dirtyObjectCurrentBoundingBoxes = this._getObjectsCurrentBoundBox(
      dirtyObjects
    );

    const clearBoundingBox = this._getBoundingBox([
      ...dirtyObjectPreviousBoundBoxes,
      ...dirtyObjectCurrentBoundingBoxes,
    ]);

    const clearBoundingBoxWithPadding = this._applyPaddingToBoundingBox(
      clearBoundingBox,
      2
    );

    // affectedObjects:HitWithinBounds
    // interface HitWithinBounds { object: SceneObject, intersection: BoundingBox }
    const affectedObjects = this._hitWithinBounds(clearBoundingBoxWithPadding);

    const sortedAffectedObjects = affectedObjects.reverse();

    this.renderer.clearRect(
      Math.floor(clearBoundingBoxWithPadding.x),
      Math.floor(clearBoundingBoxWithPadding.y),
      Math.ceil(clearBoundingBoxWithPadding.width),
      Math.ceil(clearBoundingBoxWithPadding.height)
    );

    dirtyObjects.forEach((dirtyObject) => {
      dirtyObject.draw({
        x: 0,
        y: 0,
      });
    });

    sortedAffectedObjects.forEach((affectedObject) => {
      const { object, intersection, localIntersection } = affectedObject;

      this.renderer.drawImage(
        object.cache.canvas,

        // Source
        Math.floor(localIntersection.x),
        Math.floor(localIntersection.y),
        Math.ceil(localIntersection.width),
        Math.ceil(localIntersection.height),

        // Destination
        Math.floor(intersection.x),
        Math.floor(intersection.y),
        Math.ceil(intersection.width),
        Math.ceil(intersection.height)
      );
    });

    const endDrawTime = window.performance.now();
    const totalDrawTime = endDrawTime - startDrawTime;
    track(totalDrawTime);
  }

  _getPositionRelativeTo(a, b) {
    return {
      x: b.x - a.x,
      y: b.y - a.y
    };
  }

  _getBoxIntersection(a, b) {
    const rightA = a.x + a.width;
    const bottomA = a.y + a.height;

    const rightB = b.x + b.width;
    const bottomB = b.y + b.height;

    const maxLeft = Math.max(a.x, b.x);
    const minRight = Math.min(rightA, rightB);

    const maxTop = Math.max(a.y, b.y);
    const minBottom = Math.min(bottomA, bottomB);

    const x = maxLeft;
    const y = maxTop;
    const width = minRight - maxLeft;
    const height = minBottom - maxTop;

    const noOverlap = width === 0 || height === 0;

    if (noOverlap) {
      return null;
    }

    return { x, y, width, height };
  }

  // TODO: Sort by display order
  _hitWithinBounds(boundingBox) {
    const { x, y, width, height } = boundingBox;
    const objects = this.getAll();

    const hitObjects = objects.filter((object) => {
      const leftEdgeA = x;
      const rightEdgeA = x + width;

      const leftEdgeB = object.props.x;
      const rightEdgeB = object.props.x + object.props.width;

      const topEdgeA = y;
      const bottomEdgeA = y + height;

      const topEdgeB = object.props.y;
      const bottomEdgeB = object.props.y + object.props.height;

      const leftRightEdgeCheck =
        rightEdgeA > leftEdgeB && leftEdgeA < rightEdgeB;
      const topBottomEdgeCheck =
        bottomEdgeA > topEdgeB && topEdgeA < bottomEdgeB;

      return leftRightEdgeCheck && topBottomEdgeCheck;
    });

    return hitObjects.map((object) => {
      const intersection = this._getBoxIntersection(boundingBox, object.props);
      const localPosition = this._getPositionRelativeTo(
        object.props,
        intersection
      );
      const localIntersection = {
        ...localPosition,
        width: intersection.width,
        height: intersection.height,
      };

      return {
        object,
        intersection,
        localIntersection
      };
    });
  }

  _applyPaddingToBoundingBox(box, padding) {
    return {
      x: box.x - padding,
      y: box.y - padding,
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    };
  }

  _getBoundingBox(boxes) {
    const leftPositions = boxes.map((box) => box.x);
    const topPositions = boxes.map((box) => box.y);
    const rightPositions = boxes.map((box) => box.x + box.width);
    const bottomPositions = boxes.map((box) => box.y + box.height);

    const minX = Math.min(...leftPositions);
    const maxX = Math.max(...rightPositions);

    const minY = Math.min(...topPositions);
    const maxY = Math.max(...bottomPositions);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  _getObjectsPreviousBoundBox(objects) {
    return objects.map((object) => {
      return {
        x: object.prevProps.x,
        y: object.prevProps.y,
        width: object.prevProps.width,
        height: object.prevProps.height,
      };
    });
  }

  _getObjectsCurrentBoundBox(objects) {
    return objects.map((object) => {
      return {
        x: object.props.x,
        y: object.props.y,
        width: object.props.width,
        height: object.props.height,
      };
    });
  }

  _getDirtyObjects() {
    return this.getAll().filter((object) => {
      return object.isDirty;
    });
  }

  _move(id, layerIndex) {}
  _remove(id) {}
}
