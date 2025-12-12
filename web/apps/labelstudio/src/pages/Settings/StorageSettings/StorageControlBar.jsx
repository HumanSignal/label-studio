import { Button } from "@humansignal/ui";
import { IconSearch, IconGrid, IconUploadOutline, IconPlus } from "@humansignal/icons";
import { cn } from "../../../utils/bem";

export const StorageControlBar = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  onAddSource,
  onAddTarget,
}) => {
  const filterButtons = [
    {
      id: "all",
      label: "All",
      icon: IconGrid,
      iconClassName: "size-5 flex-none",
      className: "flex flex-row justify-center items-center gap-[10px] px-8 py-5 rounded-l-[10px] rounded-r-0 flex-none font-medium text-[14px] leading-[17px]",
    },
    {
      id: "source",
      label: "Source Storage",
      icon: IconUploadOutline,
      iconClassName: "size-5",
      className: "flex flex-row justify-center items-center gap-[10px] px-8 py-5 h-[25px] rounded-none font-medium text-[14px] leading-[17px]",
    },
    {
      id: "target",
      label: "Target Storage",
      icon: IconUploadOutline,
      iconClassName: "size-5 rotate-180",
      className: "flex flex-row justify-center items-center gap-[10px] px-8 py-5 h-[25px] rounded-none font-medium text-[14px] leading-[17px]",
    },
  ];

  return (
    <div className="flex items-center gap-base mb-wider flex-wrap">
      {/* Search Bar */}
      <div className="flex flex-row items-center px-[11px] py-2 gap-[8px] w-[391px] h-[41px] flex-shrink-0 flex-1 bg-neutral-background border border-neutral-border rounded-[10px]">
        <IconSearch className="size-6 text-neutral-content-subtler pointer-events-none flex-shrink-0" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none text-neutral-content placeholder:text-neutral-content-subtler text-body-small"
        />
      </div>

      {/* Filter Buttons Group */}
      <div className="inline-flex items-center gap-0 bg-neutral-background border border-neutral-border rounded-[10px] h-[41px] overflow-hidden min-w-[408px]">
        {filterButtons.map((button) => {
          const IconComponent = button.icon;
          const isActive = filterType === button.id;
          return (
            <Button
              key={button.id}
              look="string"
              variant="neutral"
              onClick={() => onFilterChange(button.id)}
              className={cn(button.className)}
              style={{
                "--background-color": isActive ? "#4B5563" : "var(--color-neutral-background)",
                "--text-color": isActive ? "#FFFFFF" : "#222222",
                "--background-color-hover": isActive ? "#374151" : "var(--color-neutral-surface)",
                color: isActive ? "#FFFFFF" : "#222222",
              }}
            >
              <IconComponent
                className={button.iconClassName}
                style={{ color: isActive ? "#FFFFFF" : undefined }}
              />
              <span
                className={button.id === "all" ? "flex-none" : ""}
                style={{ color: isActive ? "#FFFFFF" : undefined }}
              >
                {button.label}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 h-[41px]">
        <Button
          look="filled"
          variant="primary"
          size="small"
          onClick={onAddSource}
          className="bg-neutral-content text-neutral-background hover:bg-neutral-content-subtler px-3 py-1.5 h-[41px] rounded-[10px]"
        >
          <IconPlus className="size-4 mr-1.5" />
          Add New Source
        </Button>
        <Button
          look="outlined"
          variant="neutral"
          size="small"
          onClick={onAddTarget}
          className="bg-neutral-background border-neutral-border text-neutral-content hover:bg-neutral-surface px-3 py-1.5 h-[41px] rounded-[10px] transition-colors duration-200"
        >
          <IconPlus className="size-4 mr-1.5" />
          Add Target Storage
        </Button>
      </div>
    </div>
  );
};

