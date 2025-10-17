// import { ExpressAdapter } from "@bull-board/express";
// import { createBullBoard } from "@bull-board/api";
// import { communityBoosterQueue } from "../queues/community-booster.queue.js";
// import { notificationsQueue } from "../queues/notifications.queue.js";
// import { farmPointsQueue } from "../jobs/farm-points.job.js";

// const serverAdapter = new ExpressAdapter();
// serverAdapter.setBasePath("/admin/queues");

// const BullMQAdapterPromise = import("@bull-board/api/bullMQAdapter.js");

// BullMQAdapterPromise.then(({ BullMQAdapter }) => {
//   createBullBoard({
//     queues: [
//       new BullMQAdapter(communityBoosterQueue, {
//         allowRetries: false,
//       }),
//       new BullMQAdapter(notificationsQueue, {
//         allowRetries: false,
//       }),
//       new BullMQAdapter(farmPointsQueue, {
//         allowRetries: false,
//       }),
//     ],
//     serverAdapter,
//   });
// });

// export { serverAdapter as bullBoardAdapter };
