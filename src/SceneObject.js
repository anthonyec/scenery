import EventEmitter from "./EventEmitter";

export default class SceneObject extends EventEmitter {
  cache = null;
  isDirty = true;
  children = [];
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

    this.isDirty = true;
  }

  draw(props) {
    this.internalDraw({
      ...this.props,
      ...props,
      context: this.cache,
    });

    this.isDirty = false;
  }
}
