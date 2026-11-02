MediaPipe Tasks Vision 0.10.21（Google，Apache License 2.0）
https://github.com/google-ai-edge/mediapipe
npm 包 @mediapipe/tasks-vision@0.10.21

这里存的是官方发布包里 Vision 任务需要的部分，未做改动：

  vision_bundle.mjs                       137,735 字节  ESM 入口
  wasm/vision_wasm_internal.js            204,284 字节  SIMD 版 Emscripten 加载器
  wasm/vision_wasm_internal.wasm        9,574,032 字节  SIMD 版运行时
  wasm/vision_wasm_nosimd_internal.js     204,137 字节  非 SIMD 版加载器
  wasm/vision_wasm_nosimd_internal.wasm 9,448,638 字节  非 SIMD 版运行时
  selfie_segmenter.tflite                 249,537 字节  人像分割模型

两套 WASM 都要留：FilesetResolver.forVisionTasks() 先用内嵌的 SIMD 测试模块
（Uint8Array [0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]）
试编译，成功取 wasm_internal，失败回落 wasm_nosimd_internal。删掉任一套，
对应那类浏览器就会 404。压缩传输约 2.8 MB，且只在打开换底色页时才下载。

selfie_segmenter.tflite 来自
https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite
模型卡：https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf
MobileNetV3 形状的编解码网络，输入 256x256x3，输出 256x256x1 的「这是人」概率（0~1）。
只认自拍/头像这类单人近景；训练分布之外（远景、多人、动物、风景）不可靠。

注意输出约定：categoryMask 里 0 是人、非 0 是背景，跟直觉相反。
本项目用 confidenceMasks 取浮点概率自己合成，不靠 categoryMask 的二值判断。

升级步骤：换 npm 包里的同名文件即可，目录结构不要动——wasm 路径是按
`${base}/vision_wasm_internal.wasm` 拼出来的，改名会 404。
升级后记得改 js/segment-kit.js 里的 MEDIAPIPE_PATH 注释与这里记录的版本号。

许可：以上全部为 Apache License 2.0。运行时会在页面里向
https://github.com/google-ai-edge/mediapipe 请求一次模型信息（可用
`selfieSegmenter` 的 baseOptions 关闭联网，本站已把 modelAssetBuffer 直接喂进去，
不走 URL 下载）。
