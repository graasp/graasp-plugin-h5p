export namespace H5P {
  /**
   * This interface represents a valid h5p.json manifest
   * The specification is found at
   * https://h5p.org/documentation/developers/json-file-definitions
   */
  export interface Manifest {
    /* Mandatory properties */

    /** The title of the H5P would typically be used on pages displaying it, and in system administration lists. This can be any valid string. */
    title: string;
    /** The main H5P library for this content. This library will be initialized with the content data from the content folder. */
    mainLibrary: string;
    /** A standard language code. We are using the ISO-639-1 to classify all supported languages. This is a two-letter code, for example 'en' for English. A list of ISO-639-1 codes can be found at https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes. Set "und" for language neutral content. */
    language: string;
    /** Libraries that are used by this content type and needs to be preloaded for this content type to work. The dependencies are listed as objects with machineName, majorVersion, and minorVersion. This field must at least contain the main library of the package. */
    preloadedDependencies: Array<{
      machineName: string;
      majorVersion: number | string;
      minorVersion: number | string;
    }>;
    /** List of possible embedding methods for the H5P. Specify one or both of "div" and "iframe". */
    embedTypes: ['div'] | ['iframe'] | ['div', 'iframe'] | ['iframe', 'div'];

    /* Optional properties */

    /** The name and role of the content authors. Valid values for "role" are "Author", "Editor", "Licensee", "Originator" */
    authors?: Array<{
      name: string;
      role?: 'Author' | 'Editor' | 'Licensee' | 'Originator';
    }>;
    /** The source (a URL) of the licensed material. */
    source?: string;
    /** A code for the content license. The following license codes are recognized: "CC-BY", "CC BY-SA", "CC BY-ND", "CC BY-NC", "CC BY-NC-SA", "CC CC-BY-NC-CD", "CC0 1.0", "GNU GPL", "PD", "ODC PDDL", "CC PDM", "C", "U" (Undisclosed) */
    license?:
      | 'CC-BY'
      | 'CC BY-SA'
      | 'CC BY-ND'
      | 'CC BY-NC'
      | 'CC BY-NC-SA'
      | 'CC CC-BY-NC-CD'
      | 'CC0 1.0'
      | 'GNU GPL'
      | 'PD'
      | 'ODC PDDL'
      | 'CC PDM'
      | 'C'
      | 'U';
    /** The version of the license above as a string.  Possible values for CC licenses are: "1.0", "2.0", "2.5", "3.0", "4.0". Possible values for the GNU GPL license are: "v1", "v2", "v3". Possible values for the PD license are: */
    licenseVersion?: string;
    /** Any additional information about the license */
    licenseExtras?: unknown;
    /** If a license is valid for a certain period of time, this represents the start year (as a string). */
    yearFrom?: string;
    /** If a license is valid for a certain period of time, this represents the end year (as a string). */
    yearTo?: string;
    /** The changelog. */
    changes?: Array<{
      date: string;
      author: string;
      log: string;
    }>;
    /** Comments for the editor of the content. This text will not be published as a part of copyright info. */
    authorComments?: string;
  }
}
