import React from "react";
import { useAppContext } from "../AppContext";

export function ApiConfigPanel() {
  const { apiConfig, setApiConfig, addLog } = useAppContext();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    addLog(`API配置已保存`, "success");
  };

  return (
    <div className="bg-[#161a1e] border border-[#2b2f36] rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-5 bg-[#00b07c] rounded-full"></div>
        <h2 className="text-sm font-bold tracking-wider">OKX API 设置</h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">API Key</label>
          <input
            type="text"
            name="apiKey"
            value={apiConfig.apiKey}
            onChange={handleChange}
            className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Secret Key</label>
          <input
            type="password"
            name="apiSecret"
            value={apiConfig.apiSecret}
            onChange={handleChange}
            className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Passphrase</label>
          <input
            type="password"
            name="apiPassword"
            value={apiConfig.apiPassword}
            onChange={handleChange}
            className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-2 bg-[#f0b90b] text-[#1e2329] font-bold py-2 rounded text-xs hover:bg-[#f8d33a]"
        >
          保存配置
        </button>
      </div>
    </div>
  );
}
