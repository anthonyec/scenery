# Scenery

A small library to make managing, layering and mixing individual canvas drawings easy and performant*.

* As close to the performance of rendering each canvas drawing manually. See demo [basic](demo/basic.html) vs [vanilla](demo/vanilla.html).

## How to use

## Basic example
```js
const scene = new Scene({
  canvas: document.querySelector('canvas')
});

// Create a new scene object with custom draw method.
const rectangle = new SceneObject({
  draw: ({ context, x = 0, y = 0, width = 100, height = 100 }) => {
    contect.fillRect(x, y, width, height);
  }
});

// Add the scene object to the display list.
scene.add(rectangle);

// Draw the objects in the display list.
scene.draw();
```

Scene objects can have their props modified and rerendered by calling `update()` on the object.

```js
// Move the rectangle.
rectangle.update({
  x: 100,
  y: 120
});

// Changes won't be visible unless drawn is called.
scene.draw();
```

## Behind the scenes

### Dirty rectangles

Only the parts of the scene that require a redraw will be redrawn.

### Object draw caches

Todo: implement
