import {
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Edit3,
  Expand,
  Focus,
  GalleryHorizontalEnd,
  ImagePlus,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Eye,
  Link2,
  Menu,
  MoreHorizontal,
  MousePointer2,
  Network,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { placeRelationLabels, isSideLink } from "./relationLabels";
import { familyEdgeTypes } from "./FamilyEdge";
import { RelationDialog } from "./RelationDialog";
import { RELATION_STYLES, getRelationColor, validateRelation, type RelationKind, type RelationColors } from "./relations";
import { EditorAccessDialog } from "./EditorAccessDialog";
import { ChevronLeft, ChevronRight, Pause, Play, Trash2 as TrashIcon } from "lucide-react";
import { cloudEnabled, deleteTree, listTrees, saveTree, unlockTree, SHARED_TOKEN, type CloudTree } from "./cloud";
import { Home, Explore } from "./Home";
import { ImportDialog } from "./ImportDialog";
import { ACCESS_KEY } from "./editorAccess";
import { CelestialSky, WorldTree } from "./WorldTree";
import { CARD_HEIGHT, getGenerations, layoutTree, sceneBounds, type Bounds } from "./treeGeometry";

type SkinType = "upload" | "username" | "url" | "placeholder";
type RelationType = "parent" | "sibling" | "partner";

type Skin = {
  type: SkinType;
  value: string;
};

type GalleryItem = {
  id: string;
  src: string;
  alt: string;
};

type Person = {
  id: string;
  name: string;
  clan?: string;
  skin: Skin;
  birthDate?: string;
  deathDate?: string;
  bio?: string;
  gallery: GalleryItem[];
  createdAt: string;
};

type Relation = {
  id: string;
  personA: string;
  personB: string;
  type: RelationType;
};

type PersistedState = {
  background?: string;
  branchColor?: string;
  relationColors?: RelationColors;
  showFamilyLinks?: boolean;
  showGrid?: boolean;
  started: boolean;
  persons: Person[];
  relations: Relation[];
  primaryPersonId?: string;
};

type CloudProps = {
  names: string[];
  current?: string;
  editing: boolean;
  hasPassword: boolean;
  status: string;
  others: { tree: string; persons: any[]; relations: any[] }[];
  onSelect: (name: string) => void;
  onCycle: (direction: number) => void;
  onUnlock: (password?: string) => Promise<void>;
  onLock: () => void;
  onHome: () => void;
  onDelete: () => Promise<void>;
};

type AddPreset = {
  referenceId?: string;
  relation?: AddRelationChoice;
};

type AddRelationChoice =
  | "parent"
  | "child"
  | "sibling"
  | "partner"
  | "none";

const STORAGE_KEY = "lineage.minecraft.family.v1";

const initialState: PersistedState = {
  started: false,
  persons: [],
  relations: [],
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

function skinUrl(skin: Skin): string {
  if (skin.type === "username") {
    return `https://mc-heads.net/skin/${encodeURIComponent(skin.value)}`;
  }

  return skin.value;
}

function getRelationshipLabel(
  personId: string,
  relation: Relation,
  persons: Person[],
) {
  const otherId =
    relation.personA === personId ? relation.personB : relation.personA;
  const other = persons.find((person) => person.id === otherId);
  if (!other) return "";

  if (relation.type === "partner") return `Partenaire de ${other.name}`;
  if (relation.type === "sibling") return `Frère / sœur de ${other.name}`;

  if (relation.personA === personId) {
    return `Parent de ${other.name}`;
  }

  return `Enfant de ${other.name}`;
}

function SkinFace({
  skin,
  name,
  className = "",
}: {
  skin: Skin;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = skinUrl(skin);

  if (!src || failed || skin.type === "placeholder") {
    return (
      <div
        className={`skin-face skin-placeholder ${className}`}
        aria-label={`Skin de ${name}`}
      >
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={`skin-face ${className}`} aria-label={`Skin de ${name}`}>
      <div
        className="skin-layer skin-base"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <div
        className="skin-layer skin-overlay"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <img
        className="skin-probe"
        src={src}
        alt=""
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Lineage">
      <div className="brand-mark" aria-hidden="true">
        <span className="brand-pixel brand-pixel-one" />
        <span className="brand-pixel brand-pixel-two" />
        <span className="brand-pixel brand-pixel-three" />
        <span className="brand-trunk" />
      </div>
      {!compact && (
        <div className="brand-copy">
          <strong>Lineage</strong>
          <span>Familles & clans Minecraft</span>
        </div>
      )}
    </div>
  );
}

function Landing({
  onCreate,
  onExplore,
}: {
  onCreate: () => void;
  onExplore: () => void;
}) {
  return (
    <main className="landing">
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-green" />
      <div className="grain" />
      <div className="stars" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, index) => (
          <i key={index} style={{ "--i": index } as React.CSSProperties} />
        ))}
      </div>

      <header className="landing-header">
        <Brand />
        <button className="ghost-button" onClick={onExplore}>
          Ouvrir mon arbre
          <ArrowRight size={16} />
        </button>
      </header>

      <section className="hero">
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <Sparkles size={14} />
          Vos liens. Vos mondes. Votre histoire.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
        >
          Notre
          <span> histoire.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16 }}
        >
          Construisez votre arbre. Préservez vos souvenirs.
          <br />
          Donnez un visage Minecraft à chaque génération.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.24 }}
        >
          <button className="primary-button hero-primary" onClick={onCreate}>
            Créer mon arbre
            <ArrowRight size={18} />
          </button>

          <button className="secondary-button" onClick={onExplore}>
            <Network size={18} />
            Explorer un arbre
          </button>
        </motion.div>

        <motion.div
          className="hero-preview"
          initial={{ opacity: 0, scale: 0.96, y: 35 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
        >
          <div className="preview-glow" />
          <div className="preview-topline">
            <span>
              <span className="status-dot" />
              Arbre vivant
            </span>
            <span>4 générations</span>
          </div>

          <div className="preview-tree">
            <div className="preview-person preview-person-top">
              <SkinFace
                name="Ariane"
                skin={{ type: "username", value: "Ariane" }}
              />
              <div>
                <strong>Ariane</strong>
                <span>Fondatrice</span>
              </div>
            </div>

            <div className="preview-line preview-line-vertical" />
            <div className="preview-line preview-line-horizontal" />

            <div className="preview-generation">
              <div className="preview-person">
                <SkinFace
                  name="Thomas"
                  skin={{ type: "username", value: "Notch" }}
                />
                <div>
                  <strong>Thomas</strong>
                  <span>Fils d’Ariane</span>
                </div>
              </div>

              <div className="preview-person preview-person-active">
                <SkinFace
                  name="Élise"
                  skin={{ type: "username", value: "jeb_" }}
                />
                <div>
                  <strong>Élise</strong>
                  <span>Fille d’Ariane</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="landing-footnote">
        <MousePointer2 size={14} />
        Pensé pour rester simple, même lorsque la famille grandit.
      </div>
    </main>
  );
}

function PersonNode({ data, selected }: any) {
  const person = data.person as Person;

  return (
    <motion.article
      className={`person-node ${
        selected || data.focused ? "is-selected" : ""
      } ${data.dimmed ? "is-dimmed" : ""}`}
      initial={{ opacity: 0, scale: 0.82, y: 18 }}
      animate={{ opacity: data.dimmed ? 0.34 : 1, scale: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 310, damping: 25 }}
    >
      <Handle
        id="parent-target"
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <Handle id="side-left-source" type="source" position={Position.Left} className="node-handle node-handle-side" />
      <Handle id="side-left-target" type="target" position={Position.Left} className="node-handle node-handle-side" />
      <Handle id="side-right-source" type="source" position={Position.Right} className="node-handle node-handle-side" />
      <Handle id="side-right-target" type="target" position={Position.Right} className="node-handle node-handle-side" />
      <Handle id="sibling-source" type="source" position={Position.Bottom} className="node-handle" style={{left:"35%"}} />
      <Handle id="sibling-target" type="target" position={Position.Bottom} className="node-handle" style={{left:"65%"}} />
      <Handle id="partner-source" type="source" position={Position.Top} className="node-handle" style={{left:"35%"}} />
      <Handle id="partner-target" type="target" position={Position.Top} className="node-handle" style={{left:"65%"}} />
      <svg className="card-ornament" viewBox="0 0 280 122" preserveAspectRatio="none" aria-hidden="true">
        <path d="M16 1H264L279 16V106L264 121H16L1 106V16Z M25 6H255 M25 116H255" />
        <path d="M140 0l5 5-5 5-5-5Z M140 112l5 5-5 5-5-5Z M0 61h12 M268 61h12" />
      </svg>
      <div className="node-portrait-shell">
        <SkinFace skin={person.skin} name={person.name} />
        <span className="node-online-dot" />
      </div>

      <div className="node-copy">
        <strong title={person.name}>{person.name}</strong>
        <span title={data.subtitle}>{data.subtitle}</span>
        {person.clan && <em className="clan-badge">{person.clan}</em>}
      </div>

      {data.canEdit && <button
        className="node-more nodrag"
        type="button"
        aria-label={`Actions pour ${person.name}`}
        onClick={(event) => {
          event.stopPropagation();
          data.onMenu(event, person.id);
        }}
      >
        <MoreHorizontal size={16} />
      </button>}

      <Handle
        id="parent-source"
        type="source"
        position={Position.Bottom}
        className="node-handle"
      />
    </motion.article>
  );
}

const nodeTypes = {
  person: PersonNode,
};

function getRelatedIds(id: string, relations: Relation[]) {
  const result = new Set<string>([id]);

  for (const relation of relations) {
    if (relation.personA === id) result.add(relation.personB);
    if (relation.personB === id) result.add(relation.personA);
  }

  return result;
}

function EmptyTree({ onCreate, canEdit }: { onCreate: () => void; canEdit: boolean }) {
  return (
    <motion.section
      className="empty-state"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="empty-symbol">
        <span />
        <span />
        <span />
        <i />
      </div>

      <div className="eyebrow">Premier chapitre</div>
      <h2>Votre histoire commence ici.</h2>
      <p>
        {canEdit ? "Ajoutez votre première personne et construisez votre arbre, génération après génération." : "L’arbre ne contient pas encore de personnage. Le mode édition permet de commencer votre histoire."}
      </p>

      {canEdit && <button className="primary-button" onClick={onCreate}>
        <UserPlus size={18} />
        Créer la première personne
      </button>}
    </motion.section>
  );
}

function TreeControls({
  primaryPersonId,
  bounds,
}: {
  primaryPersonId?: string;
  bounds: Bounds;
}) {
  const flow = useReactFlow();

  return (
    <div className="tree-controls" aria-label="Contrôles de l’arbre">
      <button
        title="Zoomer"
        aria-label="Zoomer"
        onClick={() => flow.zoomIn({ duration: 220 })}
      >
        <ZoomIn size={18} />
      </button>
      <button
        title="Dézoomer"
        aria-label="Dézoomer"
        onClick={() => flow.zoomOut({ duration: 220 })}
      >
        <ZoomOut size={18} />
      </button>
      <span />
      <button
        title="Voir tout l’arbre"
        aria-label="Voir tout l’arbre"
        onClick={() => flow.fitBounds(bounds, { duration: 450, padding: 0.08 })}
      >
        <Expand size={18} />
      </button>
      <button title="Cadrer les personnages" aria-label="Cadrer les personnages" onClick={() => flow.fitView({duration:450,padding:0.2,maxZoom:1.2})}>
        <Users size={18}/>
      </button>
      <button
        title="Ma position"
        aria-label="Ma position"
        disabled={!primaryPersonId}
        onClick={() => {
          if (!primaryPersonId) return;
          const node = flow.getNode(primaryPersonId);
          if (!node) return;

          flow.setCenter(node.position.x + 140, node.position.y + 61, {
            zoom: 1.15,
            duration: 450,
          });
        }}
      >
        <Crosshair size={18} />
      </button>
    </div>
  );
}

function TreeAutoFit({ bounds, aura }: { bounds: Bounds; aura: boolean }) {
  const { fitBounds, viewportInitialized } = useReactFlow();
  useEffect(() => {
    if (!viewportInitialized) return;
    let timer: number;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void fitBounds(bounds, { padding: 0.08, duration: 450 }); }, 120);
    };
    const observer = new ResizeObserver(schedule);
    const workspace = document.querySelector(".tree-workspace");
    if (workspace) observer.observe(workspace);
    schedule();
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, [bounds, fitBounds, viewportInitialized, aura]);
  return null;
}

function SearchBox({
  persons,
  onSelect,
}: {
  persons: Person[];
  onSelect: (person: Person) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];

    return persons
      .filter((person) =>
        person.name.toLocaleLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [persons, query]);

  return (
    <div className="search-wrap">
      <Search size={17} />
      <input
        value={query}
        aria-label="Rechercher une personne"
        placeholder="Rechercher un personnage"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      <kbd>⌘ K</kbd>

      <AnimatePresence>
        {open && query && (
          <motion.div
            className="search-results"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {results.length ? (
              results.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    onSelect(person);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <SkinFace skin={person.skin} name={person.name} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>Afficher dans l’arbre</small>
                  </span>
                  <Crosshair size={15} />
                </button>
              ))
            ) : (
              <div className="search-empty">
                Aucune personne nommée « {query} »
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddPersonDrawer({
  open,
  persons,
  preset,
  onClose,
  onSubmit,
}: {
  open: boolean;
  persons: Person[];
  preset: AddPreset;
  onClose: () => void;
  onSubmit: (
    person: Person,
    relationChoice: AddRelationChoice,
    referenceId?: string,
  ) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [clan, setClan] = useState("");
  const [skinType, setSkinType] = useState<SkinType>("username");
  const [skinValue, setSkinValue] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [relation, setRelation] =
    useState<AddRelationChoice>("none");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setName("");
    setClan(persons.find(person => person.id === preset.referenceId)?.clan ?? "");
    setSkinType("username");
    setSkinValue("");
    setReferenceId(preset.referenceId ?? persons[0]?.id ?? "");
    setRelation(preset.relation ?? "none");
  }, [open, preset, persons]);

  const skin: Skin = {
    type: skinValue ? skinType : "placeholder",
    value: skinValue,
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.includes("png")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSkinType("upload");
      setSkinValue(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!name.trim()) return;

    onSubmit(
      {
        id: uid(),
        name: name.trim(),
        clan: clan.trim(),
        skin,
        bio: "",
        gallery: [],
        createdAt: new Date().toISOString(),
      },
      persons.length ? relation : "none",
      referenceId || undefined,
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="drawer-backdrop"
            aria-label="Fermer"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            className="person-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-person-title"
            initial={{ x: "102%" }}
            animate={{ x: 0 }}
            exit={{ x: "102%" }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
          >
            <div className="drawer-header">
              <div>
                <div className="eyebrow">Nouvelle branche</div>
                <h2 id="add-person-title">Ajouter une personne</h2>
              </div>

              <button
                className="icon-button"
                onClick={onClose}
                aria-label="Fermer"
              >
                <X size={19} />
              </button>
            </div>

            <div className="step-indicator">
              {[1, 2, 3].map((number) => (
                <div
                  key={number}
                  className={`${step === number ? "active" : ""} ${
                    step > number ? "complete" : ""
                  }`}
                >
                  <span>{step > number ? <Check size={13} /> : number}</span>
                  <small>
                    {number === 1
                      ? "Identité"
                      : number === 2
                        ? "Skin"
                        : "Relation"}
                  </small>
                </div>
              ))}
            </div>

            <div className="drawer-content">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="identity"
                    className="form-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div className="step-number">01</div>
                    <h3>Comment s’appelle cette personne ?</h3>
                    <p>
                      Le nom sera affiché directement sous son portrait.
                    </p>

                    <label className="field">
                      <span>Nom</span>
                      <input
                        autoFocus
                        value={name}
                        maxLength={50}
                        placeholder="Ex : Alexandre"
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && name.trim()) setStep(2);
                        }}
                      />
                    </label>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="skin"
                    className="form-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div className="step-number">02</div>
                    <h3>Choisis son skin Minecraft</h3>
                    <p>
                      Le visage restera visible directement dans l’arbre.
                    </p>

                    <div className="skin-editor">
                      <div className="skin-preview-large">
                        <SkinFace skin={skin} name={name || "Personne"} />
                        <span>Aperçu frontal</span>
                      </div>

                      <div className="skin-source-tabs">
                        <button
                          className={skinType === "username" ? "active" : ""}
                          onClick={() => {
                            setSkinType("username");
                            setSkinValue("");
                          }}
                        >
                          Pseudo
                        </button>
                        <button
                          className={skinType === "upload" ? "active" : ""}
                          onClick={() => {
                            setSkinType("upload");
                            setSkinValue("");
                          }}
                        >
                          Fichier PNG
                        </button>
                        <button
                          className={skinType === "url" ? "active" : ""}
                          onClick={() => {
                            setSkinType("url");
                            setSkinValue("");
                          }}
                        >
                          URL
                        </button>
                      </div>

                      {skinType === "username" && (
                        <label className="field">
                          <span>Pseudo Minecraft</span>
                          <input
                            value={skinValue}
                            placeholder="Ex : Notch"
                            onChange={(event) =>
                              setSkinValue(event.target.value.trim())
                            }
                          />
                        </label>
                      )}

                      {skinType === "url" && (
                        <label className="field">
                          <span>URL du skin PNG</span>
                          <input
                            value={skinValue}
                            placeholder="https://exemple.com/skin.png"
                            onChange={(event) =>
                              setSkinValue(event.target.value)
                            }
                          />
                        </label>
                      )}

                      {skinType === "upload" && (
                        <label
                          className={`dropzone ${dragging ? "dragging" : ""}`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragging(true);
                          }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            handleFile(event.dataTransfer.files[0]);
                          }}
                        >
                          <UploadCloud size={25} />
                          <strong>Dépose le skin ici</strong>
                          <span>Texture Minecraft PNG, idéalement 64 × 64</span>
                          <input
                            type="file"
                            accept="image/png"
                            onChange={(event) =>
                              handleFile(event.target.files?.[0])
                            }
                          />
                        </label>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="relation"
                    className="form-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div className="step-number">03</div>
                    <h3>Cette personne est...</h3>
                    <p>
                      Le clan et la famille sont indépendants. Vous pouvez rejoindre un clan sans aucun lien de parenté.
                    </p>

                    <label className="field clan-field">
                      <span>Clan <small>facultatif</small></span>
                      <input aria-label="Clan" list="existing-clans" maxLength={50} value={clan}
                        placeholder="Ex : Les Veilleurs" onChange={event => setClan(event.target.value)} />
                      <datalist id="existing-clans">
                        {[...new Set(persons.map(person => person.clan).filter(Boolean))].map(value => <option key={value} value={value} />)}
                      </datalist>
                    </label>
                    {persons.length > 0 && (
                      <>
                        <div className="relation-grid">
                          {[
                            ["none", "Sans lien familial", "Membre libre ou du clan"],
                            ["parent", "Un parent", "Père ou mère"],
                            ["child", "Un enfant", "Fils ou fille"],
                            ["sibling", "Frère / sœur", "Lien fraternel"],
                            ["partner", "Partenaire", "Couple ou conjoint"],
                          ].map(([value, title, subtitle]) => (
                            <button
                              key={value}
                              className={relation === value ? "active" : ""}
                              onClick={() =>
                                setRelation(value as AddRelationChoice)
                              }
                            >
                              <span className="relation-icon">
                                <Link2 size={17} />
                              </span>
                              <strong>{title}</strong>
                              <small>{subtitle}</small>
                              {relation === value && (
                                <Check className="relation-check" size={15} />
                              )}
                            </button>
                          ))}
                        </div>

                        {relation !== "none" && <label className="field">
                          <span>Par rapport à</span>
                          <div className="select-shell">
                            <select
                              value={referenceId}
                              onChange={(event) =>
                                setReferenceId(event.target.value)
                              }
                            >
                              {persons.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={17} />
                          </div>
                        </label>}
                      </>
                    )}

                    {persons.length === 0 && (
                      <div className="first-person-notice">
                        <Sparkles size={20} />
                        <div>
                          <strong>Point de départ</strong>
                          <span>
                            Cette personne deviendra le centre initial de votre
                            histoire.
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="drawer-footer">
              {step > 1 ? (
                <button
                  className="secondary-button"
                  onClick={() => setStep((value) => value - 1)}
                >
                  <ArrowLeft size={17} />
                  Retour
                </button>
              ) : (
                <span />
              )}

              {step < 3 ? (
                <button
                  className="primary-button"
                  disabled={step === 1 && !name.trim()}
                  onClick={() => setStep((value) => value + 1)}
                >
                  Continuer
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button className="primary-button" onClick={submit}>
                  <Sparkles size={17} />
                  Créer la personne
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function PersonProfile({
  relationColors,
  canEdit,
  person,
  persons,
  relations,
  onClose,
  onSave,
  onDelete,
  onAddRelative,
  onRemoveRelation,
}: {
  relationColors?: RelationColors;
  canEdit: boolean;
  person?: Person;
  persons: Person[];
  relations: Relation[];
  onClose: () => void;
  onSave: (person: Person) => void;
  onDelete: (id: string) => void;
  onAddRelative: (id: string) => void;
  onRemoveRelation: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Person | undefined>(person);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    setDraft(person);
    setEditing(false);
  }, [person, canEdit]);

  if (!person || !draft) return null;

  const ownRelations = relations.filter(
    (relation) =>
      relation.personA === person.id || relation.personB === person.id,
  );

  const addGalleryFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canEdit || !editing) return;
    const files = Array.from(event.target.files ?? []);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setDraft((current) =>
          current
            ? {
                ...current,
                gallery: [
                  ...current.gallery,
                  {
                    id: uid(),
                    src: String(reader.result),
                    alt: `Souvenir de ${current.name}`,
                  },
                ],
              }
            : current,
        );
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <>
      <motion.button
        className="profile-backdrop"
        aria-label="Fermer le profil"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.aside
        className="profile-panel"
        initial={{ opacity: 0, x: 60, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="profile-actions">
          {canEdit && <button
            className="icon-button"
            onClick={() => setEditing((value) => !value)}
            aria-label="Modifier"
          >
            <Edit3 size={18} />
          </button>}
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={19} />
          </button>
        </div>

        <div className="profile-hero">
          <div className="profile-halo" />
          <SkinFace skin={draft.skin} name={draft.name} />
          <div className="profile-identity">
            <div className="eyebrow">Personnage RP</div>

            {canEdit && editing ? (
              <input
                className="profile-name-input"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            ) : (
              <h2>{draft.name}</h2>
            )}

            <span>
              {ownRelations.length} relation
              {ownRelations.length !== 1 ? "s" : ""} enregistrée
              {ownRelations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="profile-scroll">
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Informations</span>
                <h3>Repères</h3>
              </div>
              <CalendarDays size={18} />
            </div>

            <label className="field clan-field">
              <span>Clan <small>indépendant de la famille</small></span>
              <input aria-label="Clan du personnage" disabled={!canEdit || !editing} maxLength={50} value={draft.clan ?? ""}
                placeholder="Sans clan" onChange={event => setDraft({ ...draft, clan: event.target.value.trimStart() })} />
            </label>
            <div className="date-grid">
              <label className="field">
                <span>Naissance</span>
                <input
                  disabled={!canEdit || !editing}
                  type="date"
                  value={draft.birthDate ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, birthDate: event.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Décès</span>
                <input
                  disabled={!canEdit || !editing}
                  type="date"
                  value={draft.deathDate ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, deathDate: event.target.value })
                  }
                />
              </label>
            </div>
          </section>

          <section className="profile-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Connexions</span>
                <h3>Famille proche</h3>
              </div>

              {canEdit && <button
                className="text-button"
                onClick={() => onAddRelative(person.id)}
              >
                <Plus size={15} />
                Ajouter
              </button>}
            </div>

            <div className="relationship-list">
              {ownRelations.length ? (
                ownRelations.map((relation) => {
                  const otherId =
                    relation.personA === person.id
                      ? relation.personB
                      : relation.personA;
                  const other = persons.find(
                    (candidate) => candidate.id === otherId,
                  );

                  if (!other) return null;

                  return (
                    <div key={relation.id} className={`profile-relation profile-relation-${relation.type}`} style={{"--relation-color": getRelationColor(relation.type, relationColors)} as CSSProperties}>
                      <SkinFace skin={other.skin} name={other.name} />
                      <span>
                        <em className="profile-relation-kind" style={{color:getRelationColor(relation.type, relationColors)}}>{RELATION_STYLES[relation.type].symbol} {RELATION_STYLES[relation.type].label}</em>
                        <strong>{other.name}</strong>
                        <small>
                          {getRelationshipLabel(
                            person.id,
                            relation,
                            persons,
                          )}
                        </small>
                      </span>
                      {canEdit && <button className="icon-button" aria-label={`Retirer le lien avec ${other.name}`}
                        title="Retirer le lien familial" onClick={() => {
                          if (confirm(`Retirer ce lien familial avec ${other.name} ? Les personnages et leurs clans seront conservés.`)) onRemoveRelation(relation.id);
                        }}><X size={15} /></button>}
                    </div>
                  );
                })
              ) : (
                <div className="inline-empty">
                  Aucune relation enregistrée pour le moment.
                </div>
              )}
            </div>
          </section>

          <section className="profile-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Biographie</span>
                <h3>Son histoire</h3>
              </div>
              <Info size={18} />
            </div>

            {canEdit && editing ? (
              <textarea
                className="bio-editor"
                value={draft.bio ?? ""}
                placeholder="Racontez son histoire..."
                onChange={(event) =>
                  setDraft({ ...draft, bio: event.target.value })
                }
              />
            ) : (
              <p className={`bio-copy ${!draft.bio ? "muted" : ""}`}>
                {draft.bio ||
                  "Aucune histoire n’a encore été écrite pour cette personne."}
              </p>
            )}
          </section>

          <section className="profile-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Souvenirs</span>
                <h3>Galerie</h3>
              </div>

              {canEdit && editing && <label className="text-button upload-label">
                <ImagePlus size={15} />
                Ajouter
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={addGalleryFiles}
                />
              </label>}
            </div>

            {draft.gallery.length ? (
              <div className="gallery-grid">
                {draft.gallery.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLightbox(item)}
                    className="gallery-card"
                  >
                    <img src={item.src} alt={item.alt} />
                    <span>
                      <Expand size={16} />
                    </span>
                  </button>
                ))}
              </div>
            ) : canEdit && editing ? (
              <label className="gallery-empty">
                <GalleryHorizontalEnd size={24} />
                <strong>Ajoutez un premier souvenir</strong>
                <span>Capture Minecraft, construction ou événement.</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={addGalleryFiles}
                />
              </label>
            ) : <div className="inline-empty">Aucun souvenir pour le moment.</div>}
          </section>
        </div>

        {canEdit ? <div className="profile-footer">
          {canEdit && editing ? (
            <>
              <button
                className="danger-button"
                onClick={() => {
                  if (
                    confirm(
                      `Supprimer ${person.name} ? Ses relations seront également retirées.`,
                    )
                  ) {
                    onDelete(person.id);
                  }
                }}
              >
                <Trash2 size={17} />
                Supprimer
              </button>

              <button
                className="primary-button"
                disabled={!draft.name.trim()}
                onClick={() => {
                  onSave({ ...draft, name: draft.name.trim(), clan: draft.clan?.trim() });
                  setEditing(false);
                }}
              >
                <Check size={17} />
                Enregistrer
              </button>
            </>
          ) : (
            <>
              <button
                className="secondary-button"
                onClick={() => onAddRelative(person.id)}
              >
                <UserPlus size={17} />
                Ajouter un proche
              </button>

              <button
                className="primary-button"
                onClick={() => setEditing(true)}
              >
                <Edit3 size={17} />
                Modifier
              </button>
            </>
          )}
        </div> : <div className="profile-footer viewer-profile-footer"><Eye size={16}/> Consultation du personnage · Lecture seule</div>}
      </motion.aside>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <button
              className="lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="Fermer l’image"
            >
              <X size={22} />
            </button>
            <motion.img
              src={lightbox.src}
              alt={lightbox.alt}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ContextMenu({
  x,
  y,
  person,
  onClose,
  onProfile,
  onAdd,
  onFocus,
  onEdit,
  onDelete,
}: {
  x: number;
  y: number;
  person: Person;
  onClose: () => void;
  onProfile: () => void;
  onAdd: (relation: AddRelationChoice) => void;
  onFocus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <button
        className="context-dismiss"
        onClick={onClose}
        aria-label="Fermer le menu"
      />
      <motion.div
        className="context-menu"
        style={{
          left: Math.min(x, window.innerWidth - 240),
          top: Math.min(y, window.innerHeight - 390),
        }}
        initial={{ opacity: 0, scale: 0.94, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="context-person">
          <SkinFace skin={person.skin} name={person.name} />
          <span>
            <strong>{person.name}</strong>
            <small>Actions rapides</small>
          </span>
        </div>

        <button onClick={onProfile}>
          <Users size={16} />
          Voir le profil
        </button>
        <button onClick={() => onAdd("child")}>
          <UserPlus size={16} />
          Ajouter un enfant
        </button>
        <button onClick={() => onAdd("sibling")}>
          <UserPlus size={16} />
          Ajouter un frère / une sœur
        </button>
        <button onClick={() => onAdd("parent")}>
          <UserPlus size={16} />
          Ajouter un parent
        </button>
        <button onClick={() => onAdd("partner")}>
          <Link2 size={16} />
          Ajouter un conjoint
        </button>

        <hr />

        <button onClick={onFocus}>
          <Focus size={16} />
          Activer le mode focus
        </button>
        <button onClick={onEdit}>
          <Edit3 size={16} />
          Modifier
        </button>
        <button className="danger" onClick={onDelete}>
          <Trash2 size={16} />
          Supprimer
        </button>
      </motion.div>
    </>
  );
}

function Dashboard({
  state,
  setState: persistState,
  onBackToLanding,
  cloud,
}: {
  cloud?: CloudProps;
  state: PersistedState;
  setState: React.Dispatch<React.SetStateAction<PersistedState>>;
  onBackToLanding: () => void;
}) {
  const flow = useReactFlow();
  const [canEdit, setCanEdit] = useState(Boolean(cloud?.editing));
  const [aura, setAura] = useState(false);
  const nativeAura = useRef(false);
  const leaveAura = () => {
    setAura(false);
    if (nativeAura.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    nativeAura.current = false;
  };
  const enterAura = async () => {
    setSidebarOpen(false);
    setSelectedId(undefined);
    setContext(null);
    setAura(true);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      nativeAura.current = true;
      try {
        await document.documentElement.requestFullscreen();
        if (!nativeAura.current && document.fullscreenElement === document.documentElement) await document.exitFullscreen();
      }
      catch { nativeAura.current = false; }
    }
  };
  useEffect(() => {
    const onFullscreen = () => {
      if (nativeAura.current && !document.fullscreenElement) { nativeAura.current = false; setAura(false); }
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") leaveAura(); };
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onEscape);
      if (nativeAura.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  const [accessOpen, setAccessOpen] = useState(false);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);
  const [visibleRelations, setVisibleRelations] = useState<RelationKind[]>(state.showFamilyLinks === false ? [] : ["parent","sibling","partner"]);
  const editAccess = useRef(Boolean(cloud?.editing));
  // Guard all persisted tree mutations, including callbacks already queued before locking.
  const setState: React.Dispatch<React.SetStateAction<PersistedState>> = update => {
    if (!editAccess.current) return;
    persistState(current => {
      if (!editAccess.current) return current;
      return typeof update === "function" ? update(current) : update;
    });
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPreset, setDrawerPreset] = useState<AddPreset>({});
  const [selectedId, setSelectedId] = useState<string>();
  const [focusId, setFocusId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clanFilter, setClanFilter] = useState("");
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const clans = [...new Set(state.persons.map(person => person.clan?.trim()).filter(Boolean))] as string[];
  const [toast, setToast] = useState("");
  const [context, setContext] = useState<{
    x: number;
    y: number;
    personId: string;
  } | null>(null);

  const lockEditor = () => {
    editAccess.current = false;
    setCanEdit(false);
    setDrawerOpen(false);
    setSelectedId(undefined);
    setContext(null);
    setAccessOpen(false);
    setRelationDialogOpen(false);
  };
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === ACCESS_KEY || event.key === null) lockEditor();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);

  const toastTimer = useRef<number | undefined>(undefined);
  const [auto, setAuto] = useState(true);
  const cycleRef = useRef(cloud?.onCycle);
  useEffect(() => { cycleRef.current = cloud?.onCycle; });
  useEffect(() => { setSelectedId(undefined); setFocusId(undefined); setContext(null); setDrawerOpen(false); }, [cloud?.current]);
  const [importOpen, setImportOpen] = useState(false);
  useEffect(() => { if (cloud && !cloud.editing) lockEditor(); }, [cloud?.editing]);
  const beginEdit = async (password?: string) => {
    if (cloud) await cloud.onUnlock(password);
    editAccess.current = true;
    setCanEdit(true);
    setAccessOpen(false);
    showToast("Mode édition déverrouillé");
  };
  // Aura : diaporama des arbres de tout le monde, un toutes les 15 s.
  useEffect(() => {
    if (!aura || !auto || (cloud?.names.length ?? 0) < 2) return;
    const timer = window.setInterval(() => cycleRef.current?.(1), 15000);
    return () => window.clearInterval(timer);
  }, [aura, auto, cloud?.names.length]);

  const generations = useMemo(
    () => getGenerations(state.persons, state.relations),
    [state.persons, state.relations],
  );

  const focusedIds = useMemo(
    () => (focusId ? getRelatedIds(focusId, state.relations) : null),
    [focusId, state.relations],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  };

  const openContext = (
    event: ReactMouseEvent,
    personId: string,
  ) => {
    event.preventDefault();
    if (!editAccess.current) return;
    setContext({
      x: event.clientX,
      y: event.clientY,
      personId,
    });
  };

  const positions = useMemo(() => layoutTree(state.persons, state.relations), [state.persons, state.relations]);
  const bounds = useMemo(() => sceneBounds(positions), [positions]);
  const nodes = useMemo<Node[]>(() => {
    return state.persons.map((person) => {
        const firstRelation = state.relations.find(
          (relation) =>
            relation.personA === person.id ||
            relation.personB === person.id,
        );

        return {
          id: person.id,
          type: "person",
          position: positions.get(person.id)! ,
          data: {
            person,
            canEdit,
            subtitle: firstRelation
              ? getRelationshipLabel(
                  person.id,
                  firstRelation,
                  state.persons,
                )
              : "Sans lien familial",
            focused: focusId === person.id,
            dimmed: (focusedIds ? !focusedIds.has(person.id) : false) || (!!clanFilter && person.clan?.trim() !== clanFilter),
            onMenu: openContext,
          },
        };
    });
  }, [
    state.persons,
    state.relations,
    positions,
    canEdit,
    clanFilter,
    focusedIds,
    focusId,
  ]);

  const labelPositions = useMemo(() => placeRelationLabels(state.relations, positions), [state.relations, positions]);
  const edges = useMemo<Edge[]>(() => state.relations
    .filter(relation => visibleRelations.includes(relation.type))
    .map((relation) => {
      const isParent = relation.type === "parent";
      const nameA = state.persons.find(person => person.id === relation.personA)?.name ?? "";
      const nameB = state.persons.find(person => person.id === relation.personB)?.name ?? "";
      const appearance = RELATION_STYLES[relation.type];
      const side = isSideLink(relation, positions);
      const aIsLeft = (positions.get(relation.personA)?.x ?? 0) < (positions.get(relation.personB)?.x ?? 0);
      return {
        id: relation.id, source: relation.personA, target: relation.personB,
        type: "family",
        sourceHandle: side ? (aIsLeft ? "side-right-source" : "side-left-source") : isParent ? "parent-source" : `${relation.type}-source`,
        targetHandle: side ? (aIsLeft ? "side-left-target" : "side-right-target") : isParent ? "parent-target" : `${relation.type}-target`,
        data: { kind: relation.type, side, sideY: (positions.get(relation.personA)?.y ?? 0) + CARD_HEIGHT / 2, labelPosition:labelPositions.get(relation.id), color:getRelationColor(relation.type,state.relationColors), lane: state.relations.findIndex(item=>item.id===relation.id) % 3,
          dimmed: !!focusId && relation.personA !== focusId && relation.personB !== focusId,
          description: `${nameA} — ${appearance.label} — ${nameB}`,
          onInspect: () => { setFocusId(relation.personA); setSelectedId(relation.personA); },
        },
        markerEnd: isParent ? { type: MarkerType.ArrowClosed, color: getRelationColor(relation.type,state.relationColors), width: 16, height: 16 } : undefined,
      };
    }), [state.relations, state.persons, state.relationColors, focusId, visibleRelations, labelPositions, positions]);

  const selectedPerson = state.persons.find(
    (person) => person.id === selectedId,
  );

  const contextPerson = context
    ? state.persons.find((person) => person.id === context.personId)
    : undefined;

  const createPerson = (
    person: Person,
    choice: AddRelationChoice,
    referenceId?: string,
  ) => {
    if (!editAccess.current) return;
    setState((current) => {
      const nextRelations = [...current.relations];

      if (referenceId && choice !== "none") {
        let relation: Relation;

        if (choice === "parent") {
          relation = {
            id: uid(),
            personA: person.id,
            personB: referenceId,
            type: "parent",
          };
        } else if (choice === "child") {
          relation = {
            id: uid(),
            personA: referenceId,
            personB: person.id,
            type: "parent",
          };
        } else {
          relation = {
            id: uid(),
            personA: referenceId,
            personB: person.id,
            type: choice,
          };
        }

        nextRelations.push(relation);
      }

      return {
        ...current,
        persons: [...current.persons, person],
        relations: nextRelations,
        primaryPersonId: current.primaryPersonId ?? person.id,
      };
    });

    setDrawerOpen(false);
    setSelectedId(person.id);
    showToast(`${person.name} rejoint votre histoire`);


  };

  const deletePerson = (id: string) => {
    if (!editAccess.current) return;
    const person = state.persons.find((item) => item.id === id);

    setState((current) => ({
      ...current,
      persons: current.persons.filter((item) => item.id !== id),
      relations: current.relations.filter(
        (relation) =>
          relation.personA !== id && relation.personB !== id,
      ),
      primaryPersonId:
        current.primaryPersonId === id
          ? current.persons.find((item) => item.id !== id)?.id
          : current.primaryPersonId,
    }));

    setSelectedId(undefined);
    setFocusId(undefined);
    setContext(null);
    showToast(`${person?.name ?? "La personne"} a été supprimée`);
  };

  const locatePerson = (person: Person) => {
    const node = flow.getNode(person.id);
    if (!node) return;

    flow.setCenter(node.position.x + 140, node.position.y + 61, {
      zoom: 1.25,
      duration: 500,
    });
    setSelectedId(person.id);
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          ".search-wrap input",
        );
        input?.focus();
      }

      if (event.key === "Escape") {
        setContext(null);
        setFocusId(undefined);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <main className={`dashboard ${aura ? "aura-mode" : ""}`}>
      <div className="dashboard-ambient" />
      <div className="grain" />

      <header className="app-header">
        <div className="header-left">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir la navigation"
          >
            <Menu size={20} />
          </button>

          <button className="brand-button" onClick={onBackToLanding}>
            <Brand />
          </button>

          <span className="header-divider" />
          <div className="tree-title">
            {cloud?.current ? <><span>Arbre de</span><strong>{cloud.current}</strong></> : <><span>Mon espace</span><strong>Familles & clans</strong></>}
          </div>
        </div>

        <SearchBox persons={state.persons} onSelect={locatePerson} />

        <div className="header-actions">
          {focusId && (
            <button
              className="focus-pill"
              onClick={() => setFocusId(undefined)}
            >
              <Focus size={15} />
              Focus actif
              <X size={14} />
            </button>
          )}

          {cloud && cloud.names.length > 0 && <select className="mode-button tree-picker" aria-label="Choisir un arbre" value={cloud.current ?? ""} onChange={event => cloud.onSelect(event.target.value)}>
            {cloud.names.map(name => <option key={name} value={name}>{name}</option>)}
          </select>}
          <button className={`mode-button ${canEdit ? "is-editor" : ""}`} aria-label={canEdit ? "Revenir en lecture seule" : "Déverrouiller le mode édition"}
            onClick={() => canEdit ? (cloud ? cloud.onLock() : lockEditor()) : cloud?.hasPassword ? void beginEdit().catch(error => showToast(error instanceof Error ? error.message : "Erreur")) : setAccessOpen(true)}>
            {canEdit ? <LockKeyhole size={16}/> : <Eye size={16}/>}
            <span>{canEdit ? (cloud ? "Terminer" : "Édition · Verrouiller") : cloud ? "Modifier cet arbre" : "Lecture seule · Déverrouiller"}</span>
          </button>
          {canEdit && cloud && <button className="mode-button" onClick={() => setImportOpen(true)}><span>Importer des persos</span></button>}
          {canEdit && cloud && <button className="mode-button danger" aria-label="Supprimer cet arbre" onClick={() => { if (window.confirm(`Supprimer définitivement l’arbre « ${cloud.current} » ?`)) cloud.onDelete().catch(error => showToast(error instanceof Error ? error.message : "Erreur")); }}><TrashIcon size={16}/><span>Supprimer</span></button>}
          {canEdit && <button
            className="primary-button compact"
            onClick={() => {
              setDrawerPreset({});
              setDrawerOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Ajouter</span>
          </button>}
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-mobile-head">
            <Brand />
            <button
              className="icon-button"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={19} />
            </button>
          </div>

          <nav>
            <button className="active">
              <LayoutDashboard size={18} />
              Mon arbre
            </button>
            {canEdit && <button onClick={() => setAppearanceOpen(value => !value)} aria-expanded={appearanceOpen}>
              <Settings size={18} />
              Apparence
            </button>}
          </nav>

          <div className="sidebar-section">
            <span className="sidebar-label">Vue d’ensemble</span>

            <div className="stat-card">
              <div>
                <Users size={17} />
                <span>Personnages</span>
              </div>
              <strong>{state.persons.length}</strong>
              <small>
                personne{state.persons.length !== 1 ? "s" : ""}
              </small>
            </div>

            <div className="stat-row">
              <div>
                <span>Générations</span>
                <strong>
                  {new Set(generations.values()).size || 0}
                </strong>
              </div>
              <div>
                <span>Relations</span>
                <strong>{state.relations.length}</strong>
              </div>
            </div>
          </div>

          <div className="sidebar-section clan-selector">
            <label className="field"><span>Mettre un clan en lumière</span>
              <select aria-label="Mettre un clan en lumière" value={clanFilter} onChange={event => setClanFilter(event.target.value)}>
                <option value="">Tous les personnages</option>
                {clans.map(clan => <option key={clan} value={clan}>{clan}</option>)}
              </select>
            </label>
            <p>Un même clan peut réunir plusieurs familles et des membres sans parenté.</p>
          </div>
          {canEdit && appearanceOpen && <div className="sidebar-section appearance-panel">
            <span className="sidebar-label">Fond de l’arbre</span>
            <div className="palette">
              {[["#080d18", "Nuit étoilée"], ["#0e1b18", "Forêt"], ["#1b1225", "Améthyste"], ["#211915", "Obsidienne"], ["#e9e5db", "Parchemin"]].map(([color, label]) =>
                <button key={color} title={label} aria-label={`Fond ${label}`} aria-pressed={(state.background ?? "#080d18") === color}
                  style={{ background: color }} onClick={() => setState(current => ({ ...current, background: color }))}>
                  {(state.background ?? "#080d18") === color && <Check size={16} />}
                </button>)}
            </div>
            <label className="custom-color">Couleur libre<input type="color" aria-label="Couleur du fond" value={state.background ?? "#080d18"}
              onChange={event => setState(current => ({ ...current, background: event.target.value }))} /></label>
            <label className="custom-color">Lumière des branches<input type="color" aria-label="Couleur des branches" value={state.branchColor ?? "#d9b888"}
              onChange={event => setState(current => ({ ...current, branchColor: event.target.value }))} /></label>

            <div className="relation-color-settings">
              <span className="sidebar-label">Couleurs des relations</span>
              {Object.entries(RELATION_STYLES).map(([kind,style]) => <label key={kind} className="custom-color">{style.label}
                <input type="color" aria-label={`Couleur ${style.label}`} value={getRelationColor(kind as RelationKind,state.relationColors)}
                  onChange={event => { const color=event.target.value; setState(current => ({...current,relationColors:{...current.relationColors,[kind]:color}})); }} />
              </label>)}
              <button className="text-button reset-link-colors" onClick={()=>setState(current=>({...current,relationColors:undefined}))}>Rétablir les couleurs</button>
            </div>
            <label className="grid-toggle"><input type="checkbox" checked={state.showGrid === true}
              onChange={event => setState(current => ({ ...current, showGrid: event.target.checked }))} />Afficher les repères</label>
          </div>}
          <div className="sidebar-tip">
            <CircleHelp size={17} />
            <div>
              <strong>Astuce</strong>
              <span>
                {canEdit ? "Faites un clic droit sur une personne pour ajouter rapidement un proche." : "Cliquez sur une personne pour consulter son histoire, sa famille et ses souvenirs."}
              </span>
            </div>
          </div>

          {canEdit && <button className="sidebar-add" disabled={state.persons.length < 2} onClick={() => { setRelationDialogOpen(true); setSidebarOpen(false); }}>
            <Link2 size={18}/>Relier deux personnages
          </button>}
          {canEdit && <button
            className="sidebar-add"
            onClick={() => {
              setDrawerPreset({});
              setDrawerOpen(true);
              setSidebarOpen(false);
            }}
          >
            <Plus size={18} />
            Ajouter une personne
          </button>}
        </aside>

        {sidebarOpen && (
          <button
            className="mobile-sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer la navigation"
          />
        )}

        <section className={`tree-workspace ${edges.length ? "has-family-links" : ""}`} style={{ background: state.background ?? "#080d18", "--tree-gold": state.branchColor ?? "#d9b888" } as CSSProperties}>
          <CelestialSky />
          {state.persons.length === 0 && <EmptyTree canEdit={canEdit} onCreate={() => { setDrawerPreset({}); setDrawerOpen(true); }} />}
              <div className="workspace-topbar">
                <div className="workspace-context">
                  <span className="status-dot" />
                  <span>{cloud ? (canEdit ? cloud.status || "Modification en ligne" : "Lecture seule · tout le monde peut voir") : "Enregistré sur cet appareil"}</span>
                </div>

                <div className="aura-actions">
                  {aura && focusId && <button className="aura-button" onClick={()=>setFocusId(undefined)}><Focus size={15}/>Tous les liens</button>}
                  {aura && cloud && cloud.names.length > 1 && <>
                    <button className="aura-button" aria-label="Arbre précédent" onClick={() => cloud.onCycle(-1)}><ChevronLeft size={17}/></button>
                    <span className="aura-caption">{cloud.current}</span>
                    <button className="aura-button" aria-label="Arbre suivant" onClick={() => cloud.onCycle(1)}><ChevronRight size={17}/></button>
                    <button className="aura-button" onClick={() => setAuto(value => !value)}>{auto ? <Pause size={15}/> : <Play size={15}/>}{auto ? "Auto" : "Pause"}</button>
                  </>}
                  {aura && <span className="aura-caption">MODE AURA · ÉCHAP POUR QUITTER</span>}
                  <button className="aura-button" aria-label={aura ? "Quitter le mode Aura" : "Activer le mode Aura"} onClick={() => aura ? leaveAura() : void enterAura()}>
                    {aura ? <X size={17}/> : <Expand size={17}/>}{aura ? "Quitter Aura" : "Mode Aura"}
                  </button>
                </div>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={familyEdgeTypes}
                minZoom={0.08}
                maxZoom={2}

                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                panOnScroll
                selectionOnDrag={false}
                onPaneClick={() => {
                  setSelectedId(undefined);
                  setContext(null);
                }}
                onNodeClick={(_, node) => {
                  setSelectedId(node.id);
                  setFocusId(node.id);
                  setContext(null);
                }}
                onNodeDoubleClick={(_, node) => {
                  setFocusId((current) =>
                    current === node.id ? undefined : node.id,
                  );
                }}
                onNodeContextMenu={(event, node) =>
                  openContext(event as unknown as ReactMouseEvent, node.id)
                }
                proOptions={{ hideAttribution: true }}
              >
                <WorldTree positions={positions} bounds={bounds} />
                <TreeAutoFit bounds={bounds} aura={aura} />
                {state.showGrid === true && <Background
                  variant={BackgroundVariant.Dots}
                  gap={30}
                  size={1}
                  color="rgba(145, 170, 156, .24)"
                />}
                <TreeControls
                  primaryPersonId={state.primaryPersonId}
                  bounds={bounds}
                />
              </ReactFlow>

              <div className="scene-heading"><span>LES ARCHIVES DE VOTRE MONDE</span><h1>L’Arbre des liens</h1></div>
              <div className="tree-legend relation-filters" role="group" aria-label="Afficher les types de liens">
                {Object.entries(RELATION_STYLES).map(([kind,style]) => <button key={kind} aria-pressed={visibleRelations.includes(kind as RelationKind)}
                  onClick={() => setVisibleRelations(current => current.includes(kind as RelationKind) ? current.filter(value => value !== kind) : [...current,kind as RelationKind])}
                  style={{"--link-color":getRelationColor(kind as RelationKind,state.relationColors)} as CSSProperties}><i className={`legend-line legend-${kind}`}/>{style.label}<small>{state.relations.filter(relation=>relation.type===kind).length}</small></button>)}
                <button onClick={()=>setVisibleRelations(["parent","sibling","partner"])}>Tous</button>
              </div>
              <p className="scene-note">Les branches sont décoratives. Seuls les liens étiquetés indiquent une parenté.</p>
        </section>
      </div>

      {canEdit && relationDialogOpen && <RelationDialog persons={state.persons} relations={state.relations} onClose={() => setRelationDialogOpen(false)} onAdd={relation => {
        if (!editAccess.current) return;
        const error = validateRelation(relation, state.relations, state.persons.map(person => person.id));
        if (error) { showToast(error); return; }
        setState(current => validateRelation(relation, current.relations, current.persons.map(person => person.id)) ? current : ({ ...current, relations: [...current.relations, { ...relation, id:uid() }] }));
        setVisibleRelations(["parent","sibling","partner"]);
        setRelationDialogOpen(false);
        showToast("Lien familial ajouté");
      }} />}
      {accessOpen && <EditorAccessDialog onClose={() => setAccessOpen(false)} onUnlock={password => beginEdit(password)} />}
      {importOpen && cloud && <ImportDialog groups={cloud.others} onClose={() => setImportOpen(false)} onImport={(persons, relations) => {
        const ids = new Map<string, string>();
        const copies = persons.map((p: any) => { const id = uid(); ids.set(p.id, id); return { ...p, id, gallery: p.gallery ?? [], createdAt: new Date().toISOString() }; });
        const links = relations.filter((r: any) => ids.has(r.personA) && ids.has(r.personB)).map((r: any) => ({ ...r, id: uid(), personA: ids.get(r.personA)!, personB: ids.get(r.personB)! }));
        setState(cur => ({ ...cur, persons: [...cur.persons, ...copies], relations: [...cur.relations, ...links] }));
        showToast(`${copies.length} personnage(s) importé(s)`);
      }} />}
      <AddPersonDrawer
        open={canEdit && drawerOpen}
        persons={state.persons}
        preset={drawerPreset}
        onClose={() => setDrawerOpen(false)}
        onSubmit={createPerson}
      />

      <AnimatePresence>
        {selectedPerson && (
          <PersonProfile
            key={`${selectedPerson.id}-${canEdit}`}
            canEdit={canEdit}
            relationColors={state.relationColors}
            person={selectedPerson}
            persons={state.persons}
            relations={state.relations}
            onClose={() => setSelectedId(undefined)}
            onSave={(updated) => {
              if (!editAccess.current) return;
              setState((current) => ({
                ...current,
                persons: current.persons.map((person) =>
                  person.id === updated.id ? updated : person,
                ),
              }));
              showToast("Modifications enregistrées");
            }}
            onRemoveRelation={(id) => {
              if (!editAccess.current) return;
              setState(current => ({ ...current, relations: current.relations.filter(relation => relation.id !== id) }));
              showToast("Lien familial retiré ; personnages conservés");
            }}
            onDelete={deletePerson}
            onAddRelative={(id) => {
              if (!editAccess.current) return;
              setSelectedId(undefined);
              setDrawerPreset({
                referenceId: id,
                relation: "child",
              });
              setDrawerOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canEdit && context && contextPerson && (
          <ContextMenu
            x={context.x}
            y={context.y}
            person={contextPerson}
            onClose={() => setContext(null)}
            onProfile={() => {
              setSelectedId(contextPerson.id);
              setContext(null);
            }}
            onAdd={(relation) => {
              setDrawerPreset({
                referenceId: contextPerson.id,
                relation,
              });
              setDrawerOpen(true);
              setContext(null);
            }}
            onFocus={() => {
              setFocusId(contextPerson.id);
              setContext(null);
            }}
            onEdit={() => {
              setSelectedId(contextPerson.id);
              setContext(null);
            }}
            onDelete={() => {
              if (
                confirm(
                  `Supprimer ${contextPerson.name} et retirer ses relations ?`,
                )
              ) {
                deletePerson(contextPerson.id);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 22, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <span>
              <Check size={15} />
            </span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState<PersistedState>(readState); // mode local (sans serveur)
  const [showLanding, setShowLanding] = useState(!state.started);
  const [screen, setScreen] = useState<"home" | "explore" | "tree">("home");
  const [trees, setTrees] = useState<CloudTree[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [working, setWorking] = useState<PersistedState | null>(null); // copie en cours de modification
  const [status, setStatus] = useState("");
  const dirty = useRef(false);

  useEffect(() => {
    if (!cloudEnabled) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const refresh = useCallback(async () => {
    if (!cloudEnabled) return;
    try {
      const next = await listTrees();
      // On garde les anciens objets si rien n'a changé : le cadrage ne bouge pas.
      setTrees(prev => next.map(tree => prev.find(old => old.name === tree.name && old.updated_at === tree.updated_at) ?? tree));
    } catch { /* hors ligne : on garde la liste actuelle */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Sauvegarde automatique 1 s après la dernière modification.
  useEffect(() => {
    if (!working || !password || !current || !dirty.current) return;
    setStatus("Enregistrement…");
    const timer = window.setTimeout(async () => {
      try { await saveTree(password, current, SHARED_TOKEN, working); dirty.current = false; setStatus("Enregistré en ligne"); void refresh(); }
      catch (error) { setStatus(error instanceof Error ? error.message : "Échec de l’enregistrement"); }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [working, password, current, refresh]);

  const flush = () => {
    if (dirty.current && working && password && current) {
      dirty.current = false;
      saveTree(password, current, SHARED_TOKEN, working).then(() => refresh()).catch(() => {});
    }
  };
  const selectTree = (name: string) => { flush(); setWorking(null); setStatus(""); setCurrent(name); setScreen("tree"); };
  const editWorking: React.Dispatch<React.SetStateAction<PersistedState>> = update => {
    dirty.current = true;
    setWorking(cur => cur ? (typeof update === "function" ? update(cur) : update) : cur);
  };

  const createTree = async (name: string, pw: string) => {
    if ((await unlockTree(pw, name, SHARED_TOKEN)) === "mine") throw new Error("Ce nom d’arbre existe déjà, choisis-en un autre.");
    const empty: PersistedState = { ...initialState, started: true };
    await saveTree(pw, name, SHARED_TOKEN, empty);
    dirty.current = false;
    setPassword(pw); setCurrent(name); setWorking(empty); setStatus("Enregistré en ligne"); setScreen("tree");
    void refresh();
  };

  const server = trees.find(tree => tree.name === current);
  const shown = useMemo<PersistedState>(
    () => working ?? { ...initialState, ...(server?.data ?? {}), started: true },
    [working, server],
  );
  const names = trees.map(tree => tree.name);

  if (!cloudEnabled) {
    if (showLanding) return <Landing onCreate={() => { setState(c => ({ ...c, started: true })); setShowLanding(false); }} onExplore={() => { setState(c => ({ ...c, started: true })); setShowLanding(false); }} />;
    return <ReactFlowProvider><Dashboard state={state} setState={setState} onBackToLanding={() => setShowLanding(true)} /></ReactFlowProvider>;
  }
  if (screen === "home") return <Home trees={trees} onOpen={selectTree} onCreate={createTree} onExplore={() => setScreen("explore")} />;
  if (screen === "explore") return <Explore trees={trees} loaded={loaded} onOpen={selectTree} onBack={() => setScreen("home")} />;

  const cloud: CloudProps = {
    names, current, status, editing: working !== null, hasPassword: Boolean(password),
    others: [
      ...trees.filter(tree => tree.name !== current).map(tree => ({ tree: tree.name, persons: tree.data?.persons ?? [], relations: tree.data?.relations ?? [] })),
      ...(state.persons.length ? [{ tree: "Mon ancien arbre (cet appareil)", persons: state.persons, relations: state.relations }] : []),
    ],
    onSelect: selectTree,
    onCycle: direction => {
      if (names.length < 2) return;
      selectTree(names[(Math.max(0, names.indexOf(current ?? "")) + direction + names.length) % names.length]);
    },
    onLock: () => { flush(); setWorking(null); },
    onHome: () => { flush(); setWorking(null); setScreen("home"); },
    onDelete: async () => {
      if (!password || !current) return;
      const name = current;
      dirty.current = false; setWorking(null);
      try { await deleteTree(password, name); } finally { void refresh(); }
      setCurrent(undefined); setScreen("explore");
    },
    onUnlock: async pw => {
      const secret = pw ?? password;
      if (!secret || !current) throw new Error("Mot de passe manquant.");
      if (pw !== undefined) await unlockTree(pw, current, SHARED_TOKEN); // vérifie le mot de passe
      const fresh = (await listTrees()).find(tree => tree.name === current);
      dirty.current = false;
      setWorking({ ...initialState, ...(fresh?.data ?? {}), started: true });
      setPassword(secret);
    },
  };
  return (
    <ReactFlowProvider>
      <Dashboard state={shown} setState={working ? editWorking : () => {}} cloud={cloud} onBackToLanding={cloud.onHome} />
    </ReactFlowProvider>
  );
}
