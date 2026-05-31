import { CARRIER_DISPLAY_NAMES } from "./carrier-provider";
import { createMockProvider } from "./mock-responses";

export const upsProvider = createMockProvider("ups", CARRIER_DISPLAY_NAMES.ups);
