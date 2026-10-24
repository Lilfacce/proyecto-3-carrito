import { config } from './config.js';
import { crearApp } from './app.js';

crearApp().listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});
