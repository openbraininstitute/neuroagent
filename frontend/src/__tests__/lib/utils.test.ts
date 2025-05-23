// import { describe, expect, test } from "vitest";
// import { getAssociatedTools } from "@/lib/utils";
// import { MessageStrict } from "@/lib/types";
//
// describe("getAssociatedTools", () => {
//   test("correctly maps assistant messages to their associated tool messages", () => {
//     const messages: MessageStrict[] = [
//       {
//         id: "613f26bfbffb484aa7253e72339ebd16",
//         content: "Hello there",
//         role: "user",
//       },
//       {
//         id: "057fc19245d645af9268e6e1b3c3c185",
//         content: "Hello! How can I assist you today?",
//         role: "assistant",
//       },
//       {
//         id: "215801619f974504bae059ed0c06769e",
//         content: "Can you resolve the thalamus and cerebral cortex regions?",
//         role: "user",
//       },
//       {
//         id: "c473fd6288074bc384eb59c950341423",
//         content: "",
//         role: "assistant",
//         toolInvocations: [
//           {
//             toolCallId: "call_26gh1E1k2hOLrZeWfo9MxKOh",
//             toolName: "resolve-entities-tool",
//             args: {
//               brain_region: "cerebral cortex",
//             },
//             state: "result",
//             result:
//               '[{"brain_region_name": "Cerebral cortex", "brain_region_id": "http://api.brain-map.org/api/v2/data/Structure/688"}]',
//           },
//           {
//             toolCallId: "call_ntyGLbl7OHIChwGyNpqangY1",
//             toolName: "resolve-entities-tool",
//             args: {
//               brain_region: "thalamus",
//             },
//             state: "result",
//             result:
//               '[{"brain_region_name": "Thalamus", "brain_region_id": "http://api.brain-map.org/api/v2/data/Structure/549"}]',
//           },
//         ],
//       },
//       {
//         id: "62aca6af88b24601b1a17f62081b19be",
//         content: "I have resolved the thalamus and cerebral cortex regions...",
//         role: "assistant",
//       },
//       {
//         id: "OYl4Nf6xo4nxgYnM",
//         content: "could please call the same tools but sequentially?",
//         role: "user",
//       },
//       {
//         id: "JPuQWKFIqYMtj0t9",
//         role: "assistant",
//         content: "",
//         toolInvocations: [
//           {
//             state: "result",
//             toolCallId: "call_PydXiotzuvJsvlMBl27Qfu2O",
//             toolName: "resolve-entities-tool",
//             args: {
//               brain_region: "thalamus",
//               mtype: null,
//               etype: null,
//             },
//             result:
//               '[{"brain_region_name": "Thalamus", "brain_region_id": "http://api.brain-map.org/api/v2/data/Structure/549"}]',
//           },
//         ],
//       },
//       {
//         id: "hTwKQRFYRLvOCEZX",
//         role: "assistant",
//         content: "",
//         toolInvocations: [
//           {
//             state: "result",
//             toolCallId: "call_nUpLcdr8o8T2ouMguJK9IlC3",
//             toolName: "resolve-entities-tool",
//             args: {
//               brain_region: "cerebral cortex",
//               mtype: null,
//               etype: null,
//             },
//             result:
//               '[{"brain_region_name": "Cerebral cortex", "brain_region_id": "http://api.brain-map.org/api/v2/data/Structure/688"}]',
//           },
//         ],
//       },
//       {
//         id: "ongzc5s1gR5nBEBU",
//         role: "assistant",
//         content: "Here are the resolved regions...",
//       },
//     ];

//     const result = getAssociatedTools(messages);

//     // Testing each message in order
//     expect(result.get("613f26bfbffb484aa7253e72339ebd16")).toBeUndefined(); // user
//     expect(result.get("057fc19245d645af9268e6e1b3c3c185")?.size).toBe(0); // assistant
//     expect(result.get("215801619f974504bae059ed0c06769e")).toBeUndefined(); // user
//     expect(result.get("c473fd6288074bc384eb59c950341423")).toBeUndefined(); // assistant with tools

//     // First resolution
//     const firstResolution = result.get("62aca6af88b24601b1a17f62081b19be");
//     expect(firstResolution?.has("c473fd6288074bc384eb59c950341423")).toBe(true);
//     expect(firstResolution?.size).toBe(1);

//     expect(result.get("OYl4Nf6xo4nxgYnM")).toBeUndefined(); // user
//     expect(result.get("JPuQWKFIqYMtj0t9")).toBeUndefined(); // assistant with tool
//     expect(result.get("hTwKQRFYRLvOCEZX")).toBeUndefined(); // assistant with tool

//     // Sequential resolution
//     const sequentialResolution = result.get("ongzc5s1gR5nBEBU");
//     expect(sequentialResolution?.has("JPuQWKFIqYMtj0t9")).toBe(true);
//     expect(sequentialResolution?.has("hTwKQRFYRLvOCEZX")).toBe(true);
//     expect(sequentialResolution?.size).toBe(2);
//   });
// });
