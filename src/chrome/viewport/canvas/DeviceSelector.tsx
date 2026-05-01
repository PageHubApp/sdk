import React, { useEffect, useMemo, useState } from "react";
import { TbX } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import {
  getViewportDevicePresets,
  type ViewportDevicePreset,
} from "../viewportDevicePresets";
import { DeviceDimensionsAtom } from "../state/atoms";

interface DeviceSelectorProps {
  onClose: () => void;
}

export function DeviceSelector({ onClose }: DeviceSelectorProps) {
  const presets = getViewportDevicePresets();
  const presetSig = useMemo(
    () => presets.map(p => `${p.name}:${p.width}:${p.height}:${p.dpr}`).join("|"),
    [presets]
  );

  const [deviceDimensions, setDeviceDimensions] = useAtomState(DeviceDimensionsAtom);
  const [selectedDevice, setSelectedDevice] = useState<ViewportDevicePreset>(() => getViewportDevicePresets()[0]!);
  const [customWidth, setCustomWidth] = useState(deviceDimensions.width);
  const [customHeight, setCustomHeight] = useState(deviceDimensions.height);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const list = getViewportDevicePresets();
    if (list.length === 0) return;
    const ok = list.some(
      p =>
        p.name === selectedDevice.name &&
        p.width === selectedDevice.width &&
        p.height === selectedDevice.height &&
        p.dpr === selectedDevice.dpr
    );
    if (!ok) {
      const first = list[0]!;
      setSelectedDevice({ name: first.name, width: first.width, height: first.height, dpr: first.dpr });
      setCustomWidth(first.width);
      setCustomHeight(first.height);
    }
  }, [presetSig, selectedDevice.dpr, selectedDevice.height, selectedDevice.name, selectedDevice.width]);

  // Update Recoil state when dimensions change
  useEffect(() => {
    setDeviceDimensions({ width: customWidth, height: customHeight, dpr: selectedDevice.dpr || 2 });
  }, [customWidth, customHeight, selectedDevice.dpr, setDeviceDimensions]);

  const handleDeviceChange = (device: ViewportDevicePreset) => {
    setSelectedDevice(device);
    setCustomWidth(device.width);
    setCustomHeight(device.height);
    setShowDropdown(false);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setCustomWidth(value);
    if (selectedDevice.name !== "Custom") {
      setSelectedDevice({
        ...selectedDevice,
        name: "Custom",
        width: value,
        height: customHeight,
      });
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setCustomHeight(value);
    if (selectedDevice.name !== "Custom") {
      setSelectedDevice({
        ...selectedDevice,
        name: "Custom",
        width: customWidth,
        height: value,
      });
    }
  };

  return (
    <div className="text-neutral-content flex items-center gap-3 text-xs">
      {/* Device Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="hover:text-base-content flex items-center gap-1 transition-colors"
        >
          <span className="whitespace-nowrap">{selectedDevice.name}</span>
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              role="presentation"
              aria-hidden="true"
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            {/* Dropdown */}
            <div className="scrollbar-dark border-base-300 bg-neutral text-neutral-content absolute top-full left-0 z-50 mt-1 max-h-96 w-56 overflow-y-auto rounded-xl border shadow-lg">
              {presets.map(device => (
                <button
                  key={device.name}
                  onClick={() => handleDeviceChange(device)}
                  className={`hover:bg-neutral w-full px-4 py-2 text-left transition-colors ${
                    selectedDevice.name === device.name ? "bg-neutral" : ""
                  }`}
                >
                  <div className="font-medium">{device.name}</div>
                  <div className="text-neutral-content text-xs">
                    {device.width} × {device.height} • {device.dpr}x DPR
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dimensions */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={customWidth}
          onChange={handleWidthChange}
          className="hover:text-base-content w-12 bg-transparent text-center transition-colors focus:outline-none"
          placeholder="W"
        />
        <span>×</span>
        <input
          type="number"
          value={customHeight}
          onChange={handleHeightChange}
          className="hover:text-base-content w-12 bg-transparent text-center transition-colors focus:outline-none"
          placeholder="H"
        />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="hover:text-base-content transition-colors"
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Exit device mode"
      >
        <TbX className="size-4" />
      </button>
    </div>
  );
}
