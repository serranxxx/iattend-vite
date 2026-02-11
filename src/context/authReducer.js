
import { types } from "./types";


export const authReducer = (state = {}, action) => {
    switch (action.type) {
        case types.LOGIN:
            return {
                ...state,
                logged: true,
                user: action.payload
            }

        case types.LOGOUT:
            return {
                logged: false,
            }

        case types.PALETTE:
            return {
                ...state,
                colorPalette: action.payload
            }

        case types.THEME:
            return {
                ...state,
                theme: action.payload
            }

        case types.FONT:
            return {
                ...state,
                font: action.payload
            }

        case types.COVER:
            return {
                ...state,
                cover: action.payload
            }

        case types.DATE:
            return {
                ...state,
                date: action.payload
            }

        case types.invitationID:
            return {
                ...state,
                invitaion_id: action.payload
            }


        default:
            return state
    }
} 