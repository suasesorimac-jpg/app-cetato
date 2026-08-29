import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import type { Vinyl } from "../types";
import { countImages } from "../types";
import { formatYearShort } from "../lib/utils";
import { CoverImage, LabelImage } from "./VinylArt";

export const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

interface Props {
  record: Vinyl;
  onOpen: (v: Vinyl) => void;
}

export default function VinylCard({ record, onOpen }: Props) {
  const photos = countImages(record);

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="touch-manipulation group relative cursor-pointer select-none"
      onClick={() => onOpen(record)}
    >
      <div className="rounded-xl border border-slate-700/70 bg-slate-800/90 p-3 shadow-lg shadow-black/25 transition-[border-color,box-shadow] duration-300 group-hover:border-amber-500/80 group-hover:shadow-2xl group-hover:shadow-black/60">
        <div className="relative">
          {/* El disco se asoma de la funda al pasar el cursor */}
          <LabelImage
            record={record}
            className="absolute right-0 top-1/2 aspect-square h-[86%] -translate-y-1/2 translate-x-[14%] rounded-full drop-shadow-2xl drop-shadow-black/70 transition-transform duration-500 ease-out group-hover:translate-x-[42%] group-hover:rotate-[50deg]"
          />
          <CoverImage
            record={record}
            className="relative aspect-square rounded-lg border border-slate-700"
          />
          <span className="absolute right-2 top-2 z-20 rounded-full bg-amber-500 px-2.5 py-1 font-mono text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/30 sm:text-sm">
            {record.format}
          </span>
          {photos > 0 && (
            <span className="absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] text-amber-400 backdrop-blur-sm">
              <Camera size={11} />
              {photos} {photos === 1 ? "foto" : "fotos"}
            </span>
          )}
        </div>

        <div className="mt-3 px-0.5 pb-0.5">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-50">
            {record.album}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-400">{record.artist}</p>
          <p className="mt-1.5 truncate text-xs text-slate-500">
            {record.label} • {formatYearShort(record.year)}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
