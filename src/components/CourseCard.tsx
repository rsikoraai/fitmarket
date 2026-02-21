import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    thumbnailUrl: string | null;
    trainer: {
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="group flex flex-col rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden hover:border-[#10B981]/50 transition-colors duration-200">
      {/* Thumbnail */}
      <Link
        href={`/kursy/${course.id}`}
        className="relative block aspect-video bg-[#111111] overflow-hidden"
      >
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-[#2a2a2a] flex items-center justify-center">
              <svg
                className="h-6 w-6 text-[#6b7280]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.724v6.552a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
            </div>
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-2 left-2 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-xs text-white">
          {course.category}
        </span>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Trainer */}
        <div className="flex items-center gap-2 mb-3">
          {course.trainer.avatarUrl ? (
            <Image
              src={course.trainer.avatarUrl}
              alt={course.trainer.displayName}
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0">
              <User className="h-3 w-3 text-[#6b7280]" />
            </div>
          )}
          <span className="text-xs text-[#6b7280] truncate">
            {course.trainer.displayName}
          </span>
        </div>

        {/* Title */}
        <Link href={`/kursy/${course.id}`}>
          <h3 className="text-sm font-semibold text-white leading-snug mb-2 group-hover:text-[#10B981] transition-colors line-clamp-2">
            {course.title}
          </h3>
        </Link>

        {/* Description */}
        {course.description && (
          <p className="text-xs text-[#6b7280] leading-relaxed line-clamp-2 flex-1 mb-4">
            {course.description}
          </p>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#2a2a2a]">
          <span className="text-base font-bold text-white">
            {formatPrice(course.price)}
          </span>
          <AddToCartButton courseId={course.id} variant="card" />
        </div>
      </div>
    </div>
  );
}
