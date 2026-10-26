import { createContext, useContext } from "react";
import * as local from "./images";
export type CollectionStorage = Pick<typeof local, "listImages" | "addImage" | "getImageBlob" | "setFavorite" | "deleteImage">;
export const CollectionContext = createContext<CollectionStorage>(local);
export const useStorage = () => useContext(CollectionContext);
