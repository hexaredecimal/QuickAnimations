# Quick Animations
> Combine FBX animations with ease. 

## Live App
The application is deployed live [here](https://quickanimations.vercel.app/)

## Usage
1. Load your T-Pose FBX
2. Load your FBX animations (Multiselecte works)
3. Load your texture
4. Preview animations
5. Export to .glb/.gltf

NOTE: Before exporting make sure to select the T-Pose and stop the animation player from playing. The application uses the current frame as the pose for exporting. This can mess up the geometry of your mesh during export, but it is useful for other cases such as extracting poses.


## Running it locally
```sh
$ git clone https://github.com/hexaredecimal/QuickAnimations.git
$ cd QuickAnimations
$ npm install 
$ npm run dev
```
