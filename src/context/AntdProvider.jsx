// AntdProvider.jsx
import React from 'react';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import es_ES from 'antd/locale/es_ES';
// Importa estilos base de antd v5 (opcional pero recomendado)
// import 'antd/dist/reset.css';

export const AntdProvider = ({ children }) => {
  return (
    <StyleProvider >
      <ConfigProvider
        locale={es_ES}
        // modal={{
        //   centered: true,
        //   closable: false,
        //   styles: {
        //     body: {
        //       backgroundColor: "var(--brand-color-500)",
        //       paddingTop: "6px",
        //       borderRadius: "20px",
        //     },
        //   },
        // }}
        // datePicker={{ style: { width: "100%" } }}
        // drawer={{
        //   style: { borderRadius: '20px 0px 0px 20px' },
        //   styles: {
        //     header: { display: 'none' },
        //     body: {
        //       backgroundColor: 'var(--brand-color-500)',
        //       borderRadius: '20px 0px 0px 20px',
        //       paddingLeft: '6px',
        //     },
        //     wrapper: { borderRadius: '20px 0px 0px 20px' },
        //   },
        // }}
        theme={{
          components: {
            /* 👇 deja aquí todo tu objeto "components" tal cual */
            // Splitter: { splitBarDraggableSize: 100, splitBarSize: 4, splitTriggerSize: 8, colorFill: "var(--brand-color)", controlItemBgHover: "var(--secondary-color-500)", controlItemBgActive: "var(--secondary-color-600-80)", controlItemBgActiveHover: "var(--secondary-color-600-80)" },
            // Form: { itemMarginBottom: 0, labelFontSize: 12, labelColor: "var(--text-color-400)", colorError: "var(--danger-color)" },
            // Breadcrumb: { borderRadiusOuter: 999, borderRadius: 999, borderRadiusLG: 999, borderRadiusSM: 999, borderRadiusXS: 999, separatorMargin: 6 },
            // Spin: { colorPrimary: "var(--secondary-color-700)" },
            // Modal: { boxShadow: "0 0 24px rgba(0, 0, 0, 0.25)", borderRadius: 20, borderRadiusLG: 20, borderRadiusSM: 20, borderRadiusXS: 20, padding: 0, paddingContentHorizontal: 0, paddingContentHorizontalLG: 0, paddingContentVertical: 0, paddingContentVerticalLG: 0, paddingContentHorizontalSM: 0, paddingContentVerticalSM: 0, paddingLG: 0, paddingSM: 0, paddingXS: 0, paddingMD: 0, paddingXL: 0, paddingXXS: 0 },
            Button: {
              borderRadius: 8,
              colorPrimary: "#6D3CFA",
              colorPrimaryActive: "#6D3CFA",
              colorPrimaryHover: "#6D3CFA",
              fontSize: 12
              // fontWeight: 600, fontSizeSM: 12, lineHeightSM: 16, 
              // fontSize: 14, lineHeight: 16, fontSizeLG: 16, lineHeightLG: 20, 
              // defaultBg: 'var(--secondary-color-500)', 
              // defaultBorderColor: 'transparent', 
              // defaultColor: 'var(--text-color-300)', 
              // defaultHoverBg: 'var(--secondary-color-300)', 
              // defaultHoverColor: 'var(--text-color-300)', 
              // defaultHoverBorderColor: 'transparent', 
              // defaultActiveBg: 'var(--secondary-color-700)', 
              // defaultActiveBorderColor: 'transparent', 
              // defaultActiveColor: 'var(--text-color-300)', 
              // borderColorDisabled: 'transparent' },
            },
            Input: {
              // borderRadius: 999,
              colorBorder: "var(--borders)",
              colorPrimary: "#6D3CFA",
              colorPrimaryBgHover: "#6D3CFA",
              activeBorderColor: '#6D3CFA',
              colorPrimaryActive: "#6D3CFA",
              colorPrimaryHover: "#6D3CFA",
              // activeShadow: "none", fontSize: 12,
              // fontFamily: "var(--font-family)"
            },
            // InputNumber: { borderRadius: 999, colorBorder: "var(--border-color)", colorPrimary: "var(--brand-color)", colorPrimaryActive: "var(--brand-color-600)", colorPrimaryHover: "var(--brand-color-400)", activeShadow: "none", fontSize: 12, fontFamily: "var(--font-family)" },
            // DatePicker: { borderRadius: 999, colorBorder: "var(--border-color)", colorPrimary: "var(--brand-color)", colorPrimaryActive: "var(--brand-color-600)", colorPrimaryHover: "var(--brand-color-400)", activeShadow: "none", inputFontSize: 12 },
            // Collapse: { headerPadding: "12px 8px", contentPadding: "0" },
            // Radio: { colorPrimary: 'var(--brand-color-500)', colorPrimaryActive: 'var(--brand-color-700)', colorPrimaryHover: 'var(--brand-color-600)', borderRadius: 99, borderRadiusSM: 99, buttonCheckedBg: 'var(--brand-color-500-20)', buttonSolidCheckedBg: 'var(--brand-color-500-50)', fontSize: 12 },
            // Segmented: { borderRadius: 99, borderRadiusOuter: 99, borderRadiusLG: 99, borderRadiusSM: 99, colorBgBase: 'var(--secondary-color-200)', colorBgContainer: 'red', colorBgElevated: 'var(--brand-color-500)', colorText: '#FFF', itemHoverColor: 'var(--text-color-300)', itemHoverBg: 'var(--secondary-color-200)', itemActiveBg: 'var(--secondary-color-300)', fontWeightStrong: 400, fontSize: 12 },
            Select: {
              borderRadius: 99,
              borderRadiusSM: 99,
              colorPrimary: '#6D3CFA',
              hoverBorderColor: '#6D3CFA',
              activeOutlineColor: '#6D3CFA',
              controlItemBgActive: '#6D3CFA20',
              colorBorder: "var(--borders)"
            },
            // Calendar: { itemActiveBg: 'var(--secondary-color-50)', colorPrimary: 'red', controlItemBgHover: 'var(--secondary-color-400-80)', colorSplit: 'var(--secondary-color-500)', borderRadiusSM: 99 },
            // Checkbox: { borderRadius: 3, colorPrimary: 'var(--brand-color-500)', colorPrimaryActive: 'var(--brand-color-700)', colorPrimaryHover: 'var(--brand-color-400)' },
            // Drawer: { paddingLG: 0 

            Tabs: {
              colorPrimary: '#6D3CFA',
              itemHoverColor: '#6D3CFA',
              itemActiveColor: '#6D3CFA',
              lineWidthBold: 3,
              lineWidth: 1,
              itemColor: 'var(--text-color-200)',
              cardGutter: 4,
              // lineWidth: 0

            },
            Rate: {
              starColor: '#6D3CFA60'
            },
            Notification: {
              borderRadiusLG: 24, fontSize: 14, colorErrorBg: '#F1F1F1',
              colorSuccessBg: '#EFEAFF', colorInfo: '#6E3DFA',
              colorSuccess: '#6E3DFA', colorError: '#787878'
            },
            Spin: {
              colorPrimary: 'var(--brand-color-500)'
            }
          },
        }}
      >
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
};