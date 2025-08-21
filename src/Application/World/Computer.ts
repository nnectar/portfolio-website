import * as THREE from 'three';
import Application from '../Application';
import BakedModel from '../Utils/BakedModel';
import Resources from '../Utils/Resources';

export default class Computer {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;
    bakedModel: BakedModel;

    // === Customize these ===
    private ENABLE_GLOBAL_TINT = true;                 // set false if you only want per-part colors
    private GLOBAL_TINT = new THREE.Color('#000000');  // overall color (e.g. matte charcoal)
    private GLOBAL_TINT_INTENSITY = 1;              // 0=no tint, 1=full tint

    // Optional: per-part targeted tints (match by node name contains)
    private PART_TINTS: Array<{ match: RegExp; color: THREE.Color; intensity: number }> = [
        { match: /monitor/i, color: new THREE.Color('#ff0000'), intensity: 1.0 }, // Red monitor
        { match: /keyboard/i, color: new THREE.Color('#00ff00'), intensity: 1.0 }, // Green keyboard
        { match: /mouse/i, color: new THREE.Color('#35359aff'), intensity: 1.0 },    // Blue mouse
    ];

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;

        this.bakeModel();
        this.setModel();
    }

    bakeModel() {
        this.bakedModel = new BakedModel(
            this.resources.items.gltfModel.computerSetupModel,
            this.resources.items.texture.computerSetupTexture,
            900
        );
    }

    setModel() {
        const model = this.bakedModel.getModel();
        this.scene.add(model);

        // Apply color tints **after** adding to scene
        this.applyTints(model);
    }

    /**
     * Apply color tints to the baked model materials.
     * Works by multiplying a color over the baked texture (MeshBasicMaterial supports this).
     */
    private applyTints(root: THREE.Object3D) {
        root.traverse((child: THREE.Object3D) => {
            const mesh = child as THREE.Mesh;
            // Some GLTF meshes have multi-materials; normalize to an array
            const mats = (mesh && (mesh as any).isMesh)
                ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
                : null;

            if (!mats) return;

            mats.forEach((m: THREE.Material | null) => {
                if (!m) return;

                // We only want to tint basic/standard materials that have the baked map
                // Most baked pipelines use MeshBasicMaterial with a 'map'
                const mat = m as THREE.MeshBasicMaterial;
                // Guard against non-basic materials
                if (!(mat as any).isMeshBasicMaterial && !(mat as any).isMeshStandardMaterial) return;
                if (!('color' in mat)) return;

                // Compute target tint
                let targetColor: THREE.Color | null = null;
                let intensity = 0;

                if (this.ENABLE_GLOBAL_TINT) {
                    targetColor = this.GLOBAL_TINT;
                    intensity = this.GLOBAL_TINT_INTENSITY;
                }

                // Part-specific overrides by name (case-insensitive regex)
                if (child.name) {
                    for (const rule of this.PART_TINTS) {
                        if (rule.match.test(child.name)) {
                            targetColor = rule.color;
                            intensity = rule.intensity;
                            break;
                        }
                    }
                }

                if (targetColor && intensity > 0) {
                    // Multiply baked texture by tint: lerp material.color towards tint
                    // Note: MeshBasicMaterial.color multiplies with the texture map.
                    const current = (mat.color ?? new THREE.Color(0xffffff)).clone();
                    const tinted = current.lerp(targetColor, intensity);
                    mat.color.copy(tinted);
                    mat.needsUpdate = true;
                }
            });
        });

        // Helpful during setup: log node names to refine PART_TINTS rules
        // root.traverse((o) => console.log(o.name));
    }
}
