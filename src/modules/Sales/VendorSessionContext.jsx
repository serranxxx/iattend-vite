import { createContext, useContext } from 'react'

export const VendorSessionContext = createContext(null)

export const useVendorSession = () => useContext(VendorSessionContext)
