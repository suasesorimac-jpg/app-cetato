import { motion } from "framer-motion";
import type { Vinyl } from "../types";
import VinylCard from "./VinylCard";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

interface Props {
  list: Vinyl[];
  onOpen: (v: Vinyl) => void;
}

export default function VinylGrid({ list, onOpen }: Props) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      {list.map((v) => (
        <VinylCard key={v.id} record={v} onOpen={onOpen} />
      ))}
    </motion.div>
  );
}
