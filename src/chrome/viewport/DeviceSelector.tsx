import React, { useEffect, useState } from "react";
import { TbX } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { DeviceDimensionsAtom } from "./atoms";

const devicePresets = [
  { name: "iPhone 12 Pro", width: 390, height: 844, dpr: 3 },
  { name: "iPhone 12 Pro Max", width: 428, height: 926, dpr: 3 },
  { name: "iPhone SE", width: 375, height: 667, dpr: 2 },
  { name: "iPhone 13 Mini", width: 375, height: 812, dpr: 3 },
  { name: "iPhone 14", width: 390, height: 844, dpr: 3 },
  { name: "iPhone 14 Pro", width: 393, height: 852, dpr: 3 },
  { name: "iPhone 14 Pro Max", width: 430, height: 932, dpr: 3 },
  { name: "Pixel 5", width: 393, height: 851, dpr: 2.75 },
  { name: "Pixel 7", width: 412, height: 915, dpr: 2.625 },
  { name: "Samsung Galaxy S21", width: 360, height: 800, dpr: 3 },
  { name: "Samsung Galaxy S22", width: 360, height: 780, dpr: 3 },
  { name: "iPad Mini", width: 744, height: 1133, dpr: 2 },
  { name: "iPad Air", width: 820, height: 1180, dpr: 2 },
  { name: 'iPad Pro 11"', width: 834, height: 1194, dpr: 2 },
  { name: "Custom", width: 375, height: 667, dpr: 2 },
];

interface DeviceSelectorProps {
  onClose: () => void;
}

export function DeviceSelector({ onClose }: DeviceSelectorProps) {
  const [deviceDimensions, setDeviceDimensions] = useAtomState(DeviceDimensionsAtom);
  const [selectedDevice, setSelectedDevice] = useState(devicePresets[0]);
  const [customWidth, setCustomWidth] = useState(deviceDimensions.width);
  const [customHeight, setCustomHeight] = useState(deviceDimensions.height);
  const [showDropdown, setShowDropdown] = useState(false);

  // Update Recoil state when dimensions change
  useEffect(() => {
    setDeviceDimensions({ width: customWidth, height: customHeight, dpr: selectedDevice.dpr || 2 });
  }, [customWidth, customHeight, selectedDevice.dpr, setDeviceDimensions]);

  const handleDeviceChange = (device: (typeof devicePresets)[0]) => {
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
              {devicePresets.map(device => (
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
