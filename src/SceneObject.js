import EventEmitter from "./EventEmitter";

export default class SceneObject extends EventEmitter {
  cache = null;
  isDirty = true;

  // TODO: Rename, maybe this isDirty and isDirty becomes isUpdated?
  requiresRedraw = true;

  children = [];
  propsThatDontRequireRedraw = ["x", "y"];
  prevProps = {};
  props = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };

  constructor(options) {
    super();

    this.internalDraw = options.draw;
    this.cache = document.createElement("canvas").getContext("2d");

    this.prevProps = this.props;
  }

  update(newProps) {
    const oldProps = this.props;

    this.prevProps = this.props;

    this.props = {
      ...oldProps,
      ...newProps,
    };

    // TODO: Rename.
    const propsThatRequireRedraw = Object.keys(newProps).filter((propKey) => {
      return !this.propsThatDontRequireRedraw.includes(propKey);
    });

    this.isDirty = true;

    if (propsThatRequireRedraw.length) {
      // TODO: Move to better place.
      this.cache.canvas.width = this.props.width;
      this.cache.canvas.height = this.props.height;

      this.requiresRedraw = true;
    }
  }

  draw(props) {
    if (!this.requiresRedraw) {
      return;
    }

    this.internalDraw({
      ...this.props,
      ...props,
      context: this.cache,
    });

    this.isDirty = false;
    this.requiresRedraw = false;
  }
}
