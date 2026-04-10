import { TbLock, TbLockOpen } from "react-icons/tb";
import { PRESET_SIZES, type UseImageCropReturn } from "../hooks/useImageCrop";

interface CropControlsPanelProps {
  crop: UseImageCropReturn;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="toolbar-label flex items-center gap-2 font-semibold">
        <div className="h-4 w-1 rounded-full bg-primary" />
        {title}
      </h3>
      <div className="rounded-lg border border-base-300/30 bg-base-200 p-4">{children}</div>
    </div>
  );
}

function ScaleControl({
  title,
  value,
  onChange,
  min = 0.1,
  max = 10,
  step = 0.1,
  presets = [0.5, 1, 2],
}: {
  title: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
}) {
  return (
    <Card title={title}>
      <div className="mb-3 flex items-center gap-3">
        <span className="toolbar-label font-medium">Scale:</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral"
          />
        </div>
        <div className="min-w-12 rounded-md bg-primary/10 px-2 py-1 text-center text-sm font-semibold text-primary">
          {Math.round(value * 100)}%
        </div>
      </div>
      <div className="flex gap-2">
        {presets.map(preset => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className="flex-1 rounded-lg bg-neutral px-3 py-2 text-xs font-medium text-neutral-content transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {Math.round(preset * 100)}%
          </button>
        ))}
      </div>
    </Card>
  );
}

export function CropControlsPanel({ crop }: CropControlsPanelProps) {
  return (
    <div className="scrollbar-dark w-full overflow-y-auto border-base-300 bg-linear-to-b from-muted/20 to-muted/40 p-4 pb-20 sm:w-64 md:w-72 lg:w-80 lg:border-r lg:p-6">
      <div className="space-y-6">
        {/* Presets */}
        <Card title="Aspect Ratios">
          <div className="scrollbar-dark grid h-32 grid-cols-2 gap-2 overflow-y-auto">
            {PRESET_SIZES.map(preset => (
              <button
                key={preset.name}
                onClick={() => crop.handlePresetSelect(preset)}
                className="group rounded-lg border border-base-300 bg-base-200 p-2 text-left text-xs hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
              >
                <div className="font-semibold text-base-content transition-colors group-hover:text-primary">
                  {preset.name}
                </div>
                <div className="text-xs text-neutral-content">
                  {preset.width} × {preset.height}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Dimensions */}
        <Card title="Dimensions">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="crop-width-input" className="mb-1 block text-xs font-medium text-neutral-content">
                Width
              </label>
              <input
                id="crop-width-input"
                type="number"
                value={crop.customWidth}
                onChange={e => crop.handleCustomSizeChange("width", parseInt(e.target.value) || 0)}
                className="input-dialog-md focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => crop.setLockAspectRatio(!crop.lockAspectRatio)}
              className={`rounded-lg p-2 ${
                crop.lockAspectRatio
                  ? "bg-primary text-primary-content shadow-sm"
                  : "bg-neutral text-neutral-content hover:bg-primary/10 hover:text-primary"
              }`}
              title={crop.lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
            >
              {crop.lockAspectRatio ? <TbLock className="size-4" /> : <TbLockOpen className="size-4" />}
            </button>
            <div className="flex-1">
              <label htmlFor="crop-height-input" className="mb-1 block text-xs font-medium text-neutral-content">
                Height
              </label>
              <input
                id="crop-height-input"
                type="number"
                value={crop.customHeight}
                onChange={e => crop.handleCustomSizeChange("height", parseInt(e.target.value) || 0)}
                className="input-dialog-md focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        </Card>

        {/* Crop Scale */}
        <ScaleControl
          title="Crop Size"
          value={crop.cropScale}
          onChange={crop.handleCropScaleChange}
          min={0.1}
          max={3}
          presets={[0.5, 1, 2]}
        />

        {/* Zoom */}
        <ScaleControl
          title="Zoom"
          value={crop.previewScale}
          onChange={value => {
            crop.setPreviewScale(value);
            crop.setViewportPosition({ x: 0, y: 0 });
          }}
          min={0.1}
          max={10}
          presets={[0.5, 1, 2]}
        />

        {/* Export Settings */}
        <Card title="Export Settings">
          <div className="mb-4">
            <label htmlFor="crop-version-name-input" className="mb-1 block text-xs font-medium text-neutral-content">
              Version Name
            </label>
            <input
              id="crop-version-name-input"
              type="text"
              value={crop.versionName}
              onChange={e => crop.setVersionName(e.target.value)}
              placeholder={`${crop.customWidth}x${crop.customHeight} crop`}
              className="input-dialog-md focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="mb-4">
            <span className="toolbar-label mb-2 block font-medium">Format</span>
            <div className="grid grid-cols-3 gap-1">
              {([
                { value: "webp", label: "WebP", desc: "Best" },
                { value: "png", label: "PNG", desc: "Lossless" },
                { value: "jpeg", label: "JPEG", desc: "Universal" },
              ] as const).map(format => (
                <button
                  key={format.value}
                  onClick={() => crop.setImageFormat(format.value)}
                  className={`rounded-lg p-1.5 text-xs font-medium transition-colors ${
                    crop.imageFormat === format.value
                      ? "bg-primary text-primary-content"
                      : "bg-neutral text-neutral-content hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <div className="text-xs font-semibold">{format.label}</div>
                  <div className="text-xs opacity-70">{format.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="toolbar-label font-medium">Quality:</span>
              <div className="relative flex-1">
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={crop.imageQuality}
                  onChange={e => crop.setImageQuality(parseInt(e.target.value))}
                  className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral"
                />
              </div>
              <div className="min-w-12 rounded-md bg-primary/10 px-2 py-1 text-center text-sm font-semibold text-primary">
                {crop.imageQuality}%
              </div>
            </div>
            <div className="flex gap-2">
              {[50, 75, 90, 100].map(preset => (
                <button
                  key={preset}
                  onClick={() => crop.setImageQuality(preset)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    crop.imageQuality === preset
                      ? "bg-primary text-primary-content"
                      : "bg-neutral text-neutral-content hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
