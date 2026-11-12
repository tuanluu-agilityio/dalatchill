import { pipeline, RawImage } from '@huggingface/transformers';
const [,, input, output] = process.argv;
const pipe = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'fp32' });
const img = await RawImage.read(input);
const { depth } = await pipe(img);
console.log('depth size', depth.width, depth.height, depth.channels);
await depth.save(output);
