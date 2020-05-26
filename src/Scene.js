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
  clearRectPadding = 1;

  displayList = {};
  displayOrder = [];

  constructor(options) {
    super();

    this.canvasWidth = options.canvas.width;
    this.canvasHeight = options.canvas.height;
    this.context = options.canvas.getContext('2d');
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
      return x >= object.props.x
          && y >= object.props.y
          && x <= object.props.x + object.props.width
          && y <= object.props.y + object.props.height;
    });
  }

  hitWithinBounds(x, y, width, height, options = { exclude: [] }) {
    const objects = this.getAll();

    return objects.filter((object) => {
      if (options.exclude.includes(object.id)) {
        return false;
      }

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

  draw(dontDraw) {
    const startDrawTime = window.performance.now();

    /* Get objects marked as dirty. */
    const dirtyObjectIds = this._getDirtyObjectIds();
    const hasDirtyObjects = dirtyObjectIds.length > 0;

    if (hasDirtyObjects) {

      /* Get area that needs cleaning. */
      this.dirtyBounds = this._getBoundsForObjects(dirtyObjectIds, true);

      /* Clean dirty area. */
      this.context.clearRect(
        this.dirtyBounds.x - this.clearRectPadding,
        this.dirtyBounds.y - this.clearRectPadding,
        this.dirtyBounds.width + this.clearRectPadding * 2,
        this.dirtyBounds.height + this.clearRectPadding * 2
      );

      /* Check for existing objects that are affected by cleaning. */
      const hits = this.hitWithinBounds(
        this.dirtyBounds.x,
        this.dirtyBounds.y,
        this.dirtyBounds.width,
        this.dirtyBounds.height
      );

      /* Check existing objects that affected by new object. */
      /* TODO: Be smarter if object has nothing above it in the stack */
      const objectsThatNeedRecompositing = this.getAll(dirtyObjectIds).map((object) => {
        return this.hitWithinBounds(
          object.props.x,
          object.props.y,
          object.props.width,
          object.props.height,
          {
            exclude: [object.id]
          }
        );
      }).flat();


      /* Draw objects (to their internal cache) that have been updated. */
      const dirtyObjects = this.getAll(dirtyObjectIds);

      if (!dontDraw) {
        dirtyObjects.forEach((object) => {
          object.draw({
            x: 0,
            y: 0
          });
        });
      }

      const objectsToComposite = [...hits, ...dirtyObjects, ...objectsThatNeedRecompositing].reduce((mem, object) => {
        if (!mem[object.id]) {
          mem[object.id] = object;
        }

        return mem;
      }, {});

      /* Sort objects in correct compositing order. */
      /* TODO: Ensure this works */
      const sorted = Object.values(objectsToComposite).sort((a, b) => {
        const indexOfA = this.displayOrder.indexOf(a.id);
        const indexOfB = this.displayOrder.indexOf(b.id);

        return indexOfA - indexOfB;
      });

      /* Composite objects that need compositing. */
      sorted.forEach((object) => {
        this.context.drawImage(
          object.cache.canvas,
          0,
          0,
          object.props.width,
          object.props.height,
          object.props.x,
          object.props.y,
          object.props.width,
          object.props.height
        )
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

  _move(id, layerIndex) {}
  _remove(id) {}
}
